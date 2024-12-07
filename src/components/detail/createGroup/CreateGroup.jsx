import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useUserStore } from "../../../lib/userStore";
import { useNavigate } from "react-router-dom";
import "./createGroup.css";

const CreateGroup = () => {
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [availableUsers, setAvailableUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const { currentUser } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.id !== currentUser.id);
        setAvailableUsers(users);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    fetchUsers();
  }, [currentUser.id]);

  const addToGroup = (userId) => {
    setSelectedUsers(prev => new Set([...prev, userId]));
  };

  const removeFromGroup = (userId) => {
    const newSelected = new Set(selectedUsers);
    newSelected.delete(userId);
    setSelectedUsers(newSelected);
  };

  const handleCreateGroup = async () => {
    if (!groupName) {
      alert("Please enter a group name");
      return;
    }
    if (selectedUsers.size < 2) {
      alert("Please select at least 2 users");
      return;
    }

    try {
      // Create group chat document
      const groupChatRef = await addDoc(collection(db, "chats"), {
        type: "group",
        name: groupName,
        members: [...selectedUsers, currentUser.id],
        createdAt: serverTimestamp(),
        lastMessage: {
          text: "Group created",
          sender: currentUser.id,
          timestamp: serverTimestamp()
        }
      });

      // Create initial message
      await addDoc(collection(db, "messages"), {
        chatId: groupChatRef.id,
        senderId: currentUser.id,
        text: "Group created",
        timestamp: serverTimestamp()
      });

      navigate("/"); // Navigate back to main chat
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group");
    }
  };

  return (
    <div className="container">
      <h2>Create Group Chat</h2>
      <div className="group-form">
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
        />
        
        <div className="user-list">
          <h3>Available Users</h3>
          {availableUsers.map(user => (
            !selectedUsers.has(user.id) && (
              <div key={user.id} className="user-item">
                <span>{user.username}</span>
                <button onClick={() => addToGroup(user.id)}>Add</button>
              </div>
            )
          ))}
        </div>

        <div className="selected-users">
          <h3>Selected Users</h3>
          {availableUsers.map(user => (
            selectedUsers.has(user.id) && (
              <div key={user.id} className="user-item">
                <span>{user.username}</span>
                <button onClick={() => removeFromGroup(user.id)}>Remove</button>
              </div>
            )
          ))}
        </div>

        <button id="create-group-btn" onClick={handleCreateGroup}>
          Create Group
        </button>
      </div>
    </div>
  );
};

export default CreateGroup;