import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, arrayRemove, deleteDoc, getDoc, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import EmojiPicker from "emoji-picker-react";
import { format } from "timeago.js";  // Add this import
import upload from "../../lib/upload";  // Change to default import
import "./groupChat.css";

const GroupChat = ({ group, onReturn, onEdit }) => {
  const navigate = useNavigate();
  const { currentUser } = useUserStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newGroupName, setNewGroupName] = useState(group.groupName);
  const [newGroupImage, setNewGroupImage] = useState(null);
  const [newGroupBio, setNewGroupBio] = useState(group.groupBio || "");
  const [showDetails, setShowDetails] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [newUserName, setNewUserName] = useState(currentUser.username);
  const [newUserBio, setNewUserBio] = useState(currentUser.bio || "");
  const [newUserImage, setNewUserImage] = useState(null);
  const [text, setText] = useState("");
  const [img, setImg] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);

  useEffect(() => {
    const fetchMembers = async () => {
      const members = [];
      for (const memberId of group.members) {
        const memberDoc = await getDoc(doc(db, "users", memberId));
        if (memberDoc.exists()) {
          const userData = memberDoc.data();
          members.push({ 
            id: memberId, 
            ...userData,
            photoURL: userData.photoURL || userData.avatar // Ensure we get the photo URL
          });
        }
      }
      setGroupMembers(members);
    };
    
    fetchMembers();
  }, [group.members]);

  useEffect(() => {
    // Add message listener
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", group.id),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = [];
      snapshot.forEach((doc) => {
        messageData.push({ id: doc.id, ...doc.data() });
      });
      setMessages(messageData);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [group.id]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const groupRef = doc(db, "chats", group.id);
      const updates = {};
      
      // Only add properties if they have values
      if (newGroupName && newGroupName.trim()) {
        updates.groupName = newGroupName.trim();
      }
      
      if (newGroupImage) {
        updates.groupAvatar = newGroupImage;
      }

      if (newGroupBio !== group.groupBio) {
        updates.groupBio = newGroupBio;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await updateDoc(groupRef, updates);
        setShowEditModal(false);
        
        // Update the local group data
        if (onEdit) {
          onEdit({
            ...group,
            ...updates
          });
        }
      }
    } catch (err) {
      console.error("Error updating group:", err);
    }
  };

  const handleUserEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, "users", currentUser.id);
      const updates = {};
      
      if (newUserName && newUserName.trim()) {
        updates.username = newUserName.trim();
      }
      
      if (newUserImage) {
        updates.photoURL = newUserImage;
      }

      if (newUserBio !== currentUser.bio) {
        updates.bio = newUserBio;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
        setShowUserEditModal(false);
      }
    } catch (err) {
      console.error("Error updating user profile:", err);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGroupImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImg(file);  // Store the actual file
        setImgPreview(reader.result);  // Store base64 for preview
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !img) return;

    try {
      let imgUrl = null;
      if (img) {
        // Upload the image and get URL
        imgUrl = await upload(img);
      }

      const messageData = {
        chatId: group.id,
        text: text.trim(),
        senderId: currentUser.id,
        senderName: currentUser.username,
        timestamp: serverTimestamp(),
      };

      if (imgUrl) {
        messageData.img = imgUrl;
      }

      // Add message to messages collection
      await addDoc(collection(db, "messages"), messageData);

      // Update last message in chat
      await updateDoc(doc(db, "chats", group.id), {
        lastMessage: {
          text: imgUrl ? "Sent an image" : text.trim(),
          sender: currentUser.id,
          timestamp: serverTimestamp()
        }
      });

      setText("");
      setImg(null);
      setImgPreview(null);
      setShowEmoji(false);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const linkify = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'blue', textDecoration: 'underline' }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleEmoji = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  return (
    <div className="groupChat">
      <div className="header">
        <div className="groupInfo">
          <img src={group.groupAvatar || "/default-group.png"} alt={group.groupName} />
          <div className="info">
            <h2>{group.groupName}</h2>
            <p className="bio">{group.groupBio || "No bio yet"}</p>
          </div>
        </div>
        <div className="actions">
          <button onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
          <button onClick={() => setShowEditModal(true)}>Edit Group</button>
          <button onClick={onReturn}>Return to Groups</button>
          <button onClick={() => navigate('/')}>Return to Chats</button>
        </div>
      </div>

      <div className={`chatContainer ${showDetails ? 'withDetails' : ''}`}>
        <div className="messages">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`message ${msg.senderId === currentUser.id ? 'own' : ''}`}
            >
              {!msg.senderId && <span className="systemMessage">{msg.text}</span>}
              {msg.senderId && (
                <>
                  <span className="sender">{msg.senderId === currentUser.id ? 'You' : msg.senderName}</span>
                  <div className="content">
                    {msg.text && <p>{linkify(msg.text)}</p>}
                    {msg.img && (
                      <img 
                        src={msg.img} 
                        alt="message" 
                        className="message-image"
                        onClick={() => window.open(msg.img, '_blank')}
                      />
                    )}
                    <span className="timestamp">
                      {msg.timestamp ? format(msg.timestamp.toDate()) : ''}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {showDetails && (
          <div className="detailsPanel">
            <div className="detailsSection">
              <h3>Members ({groupMembers.length})</h3>
              <div className="userProfile">
                <img 
                  src={currentUser.avatar || currentUser.photoURL || "/default-avatar.png"} 
                  alt={currentUser.username} 
                />
                <h2>{currentUser.username}</h2>
                <p className="bio">{currentUser.bio || "No bio yet"}</p>
                <button onClick={() => setShowUserEditModal(true)}>Edit Profile</button>
              </div>

              <div className="membersList">
                {groupMembers
                  .filter(member => member.id !== currentUser.id)
                  .map(member => (
                    <div key={member.id} className="memberItem">
                      <img 
                        src={member.avatar || member.photoURL || "/default-avatar.png"} 
                        alt={member.username} 
                      />
                      <div className="memberInfo">
                        <span className="username">{member.username}</span>
                        <p className="bio">{member.bio || "No bio"}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="inputArea">
        {imgPreview && (
          <div className="imagePreviewContainer">
            <div className="imagePreview">
              <img src={imgPreview} alt="Preview" />
              <button onClick={() => {
                setImg(null);
                setImgPreview(null);
              }}>×</button>
            </div>
          </div>
        )}
        <input
          type="file"
          id="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />
        <label htmlFor="file">
          <img src="/download.png" alt="Upload" style={{ width: '24px', height: '24px' }} />
        </label>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <div className="emojiButton">
          <img 
            src="/emoji.png" 
            alt="emoji" 
            onClick={(e) => {
              e.stopPropagation(); // Add this to prevent event bubbling
              setShowEmoji(!showEmoji);
            }}
          />
          {showEmoji && (
            <div className="emojiPicker" onClick={e => e.stopPropagation()}>
              <EmojiPicker
                onEmojiClick={handleEmoji}
                theme="dark"
                height={400}
                width={300}
                previewConfig={{ showPreview: false }}
                searchDisabled={true}
                skinTonesDisabled={true}
                categories={['smileys_people', 'animals_nature', 'food_drink', 'travel_places', 'activities', 'objects', 'symbols', 'flags']}
                emojiStyle="native"
              />
            </div>
          )}
        </div>
        <button onClick={handleSend}>Send</button>
      </div>

      {showEditModal && (
        <div className="modal">
          <form onSubmit={handleEditSubmit}>
            <input
              type="text"
              placeholder="New group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            <textarea
              placeholder="Group bio"
              value={newGroupBio}
              onChange={(e) => setNewGroupBio(e.target.value)}
            />
            <div className="buttons">
              <button type="submit">Save Changes</button>
              <button type="button" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showUserEditModal && (
        <div className="modal">
          <form onSubmit={handleUserEditSubmit}>
            <input
              type="text"
              placeholder="Your name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            <textarea
              placeholder="Your bio"
              value={newUserBio}
              onChange={(e) => setNewUserBio(e.target.value)}
            />
            <div className="buttons">
              <button type="submit">Save Changes</button>
              <button type="button" onClick={() => setShowUserEditModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default GroupChat;