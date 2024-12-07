import { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, arrayUnion, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";
import { useNavigate } from "react-router-dom";
import Chat from "../chat/Chat"; // Add this import
import GroupChat from './GroupChat';
import "./groups.css";

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const { currentUser } = useUserStore();
  const { setChatUser } = useChatStore();
  const navigate = useNavigate();
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [groupImage, setGroupImage] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editGroupImage, setEditGroupImage] = useState(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [groupBio, setGroupBio] = useState("");  // Add this line

  const fetchGroups = async () => {
    const q = query(
      collection(db, "chats"),
      where("type", "==", "group"),
      where("members", "array-contains", currentUser.id)
    );

    const querySnapshot = await getDocs(q);
    const groupsData = [];
    querySnapshot.forEach((doc) => {
      groupsData.push({ id: doc.id, ...doc.data() });
    });
    setGroups(groupsData);
  };

  useEffect(() => {
    fetchGroups();
  }, [currentUser.id]);

  useEffect(() => {
    if (showAddUsers) {
      loadFriends();
    }
  }, [showAddUsers]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      // Create group chat document
      const groupChatDoc = await addDoc(collection(db, "chats"), {
        type: "group",
        groupName: groupName,
        groupAvatar: groupImage,
        groupBio: groupBio,  // Add this line
        members: [currentUser.id],
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
        lastMessage: {
          text: "Group created",
          sender: currentUser.id,
          timestamp: serverTimestamp()
        }
      });

      // Create initial message
      await addDoc(collection(db, "messages"), {
        chatId: groupChatDoc.id,
        text: "Group created",
        senderId: currentUser.id,
        senderName: currentUser.username,
        timestamp: serverTimestamp()
      });

      // Set chat user without navigating
      setChatUser({
        id: groupChatDoc.id,
        username: groupName,
        avatar: groupImage,
        isGroup: true,
        members: [currentUser.id],
        type: "group"
      });

      // Reset states without navigating
      setShowCreateGroup(false);
      setGroupName("");
      setGroupImage(null);
      
      // Refresh groups list
      fetchGroups(); // You'll need to extract the fetchGroups function
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setShowGroupChat(true);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!selectedUser || !selectedGroup) return;

    try {
      // Update group members
      const groupRef = doc(db, "chats", selectedGroup.id);
      await updateDoc(groupRef, {
        members: arrayUnion(selectedUser.id)
      });

      // Add system message about new member
      await addDoc(collection(db, "messages"), {
        chatId: selectedGroup.id,
        text: `${selectedUser.username} has joined the group`,
        senderId: "system",
        timestamp: serverTimestamp()
      });

      // Update last message
      await updateDoc(groupRef, {
        lastMessage: {
          text: `${selectedUser.username} has joined the group`,
          sender: "system",
          timestamp: serverTimestamp()
        }
      });

      // Refresh the groups list
      const q = query(
        collection(db, "chats"),
        where("type", "==", "group"),
        where("members", "array-contains", currentUser.id)
      );

      const querySnapshot = await getDocs(q);
      const groupsData = [];
      querySnapshot.forEach((doc) => {
        groupsData.push({ id: doc.id, ...doc.data() });
      });
      setGroups(groupsData);

      // Reset states
      setShowAddUsers(false);
      setSelectedUser(null);
      setSelectedGroup(null);
      setSearchResults([]);
    } catch (err) {
      console.log(err);
    }
  };

  const getFriendsList = async () => {
    try {
      const userChatsDoc = await getDoc(doc(db, "userchats", currentUser.id));
      if (!userChatsDoc.exists()) return [];
      
      const friendsData = userChatsDoc.data().chats || [];
      const uniqueFriends = new Map();
      
      for (const chat of friendsData) {
        // Skip if user is already in the group
        if (selectedGroup?.members.includes(chat.receiverId)) continue;
        
        // Only get user data if we haven't processed this user yet
        if (!uniqueFriends.has(chat.receiverId)) {
          const userDoc = await getDoc(doc(db, "users", chat.receiverId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            uniqueFriends.set(chat.receiverId, {
              id: chat.receiverId,
              username: userData.username,
              photoURL: userData.photoURL || userData.avatar || "/default-avatar.png",  // Make sure we have a default
            });
          }
        }
      }
      
      return Array.from(uniqueFriends.values());
    } catch (error) {
      console.error("Error fetching friends:", error);
      return [];
    }
  };

  const loadFriends = async () => {
    const friends = await getFriendsList();
    setSearchResults(friends);
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditGroupImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditGroup = async (updatedGroup) => {
    try {
      // Update the selected group with new data
      setSelectedGroup(updatedGroup);
      
      // Refresh the groups list to show updated data
      await fetchGroups();
    } catch (err) {
      console.error("Error updating group:", err);
    }
  };

  return (
    <div className="groups">
      {!showGroupChat ? (
        <>
          <div className="header">
            <h1>Groups</h1>
            <button className="returnButton" onClick={() => navigate('/')}> 
              Return to Chats
            </button>
          </div>

          <div className="groupList">
            <div className="existingGroups">
              {groups.map((group) => (
                <div key={group.id} className="groupItem" onClick={() => handleSelectGroup(group)}>
                  <img 
                    src={group.groupAvatar || "/default-group.png"} 
                    alt={group.groupName} 
                  />
                  <div className="groupInfo">
                    <div className="name">{group.groupName}</div>
                    <div className="memberCount">{group.members.length} members</div>
                  </div>
                  <div 
                    className="addMember" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGroup(group);
                      setShowAddUsers(true);
                    }}
                  >
                    <img src="/plus.png" alt="Add Member" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            className="createGroup" 
            onClick={() => setShowCreateGroup(true)}
          >
            Create New Group
          </button>

          {showCreateGroup && (
            <div className="modal">
              <form onSubmit={handleCreateGroup}>
                <input
                  type="text"
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <textarea
                  placeholder="Group bio (optional)"
                  value={groupBio}
                  onChange={(e) => setGroupBio(e.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <button type="submit">Create</button>
                <button type="button" onClick={() => setShowCreateGroup(false)}>
                  Cancel
                </button>
              </form>
            </div>
          )}

          {showAddUsers && (
            <div className="modal">
              <div className="addUsersModal">
                <h3>Add members to {selectedGroup?.groupName}</h3>
                <div className="userList">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className={`userItem ${selectedUser?.id === user.id ? 'selected' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="userItemContent">
                        <img src={user.photoURL} alt={user.username} />
                        <span>{user.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="modalButtons">
                  <button 
                    className="addButton" 
                    onClick={handleAddUser}
                    disabled={!selectedUser}
                  >
                    Add Selected User
                  </button>
                  <button 
                    className="cancelButton" 
                    onClick={() => {
                      setShowAddUsers(false);
                      setSelectedUser(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showChat && (
            <Chat />
          )}
        </>
      ) : (
        <GroupChat 
          group={selectedGroup}
          onReturn={() => setShowGroupChat(false)}
          onEdit={handleEditGroup}
        />
      )}
    </div>
  );
};

export default Groups;