import { useEffect, useRef, useState } from "react";
import "./Chat.css";  // Updated import with correct casing
import EmojiPicker from "emoji-picker-react";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import upload from "../../lib/upload";  // Change to default import
import { format } from "timeago.js";

const Chat = ({ isGroupChat }) => {
  const [messages, setMessages] = useState([]);
  const [chat, setChat] = useState({ messages: [] });
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [img, setImg] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();

  const endRef = useRef(null);
  const [userAvatars, setUserAvatars] = useState({});

  useEffect(() => {
    if (messages?.length) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

    const unSub = onSnapshot(
      query(
        collection(db, "messages"),
        where("chatId", "==", chatId),
        orderBy("timestamp", "asc")
      ),
      (snapshot) => {
        const messageList = [];
        snapshot.forEach((doc) => {
          messageList.push({ id: doc.id, ...doc.data() });
        });
        setMessages(messageList);
        
        // Scroll to bottom when messages change
        setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    );

    return () => unSub();
  }, [chatId]);

  const fetchUserAvatar = async (userId) => {
    if (userAvatars[userId]) return userAvatars[userId];
    
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const avatar = userDoc.data().avatar;
        setUserAvatars(prev => ({ ...prev, [userId]: avatar }));
        return avatar;
      }
    } catch (err) {
      console.error("Error fetching user avatar:", err);
    }
    return null;
  };

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImg(file);  // Store the file directly
        setImgPreview(reader.result);  // Store preview URL separately
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!text && !img) return;

    try {
      let imgUrl = null;
      if (img) {
        imgUrl = await upload(img);  // Upload the file directly
      }

      // Create message document
      await addDoc(collection(db, "messages"), {
        chatId,
        text: text || "",
        img: imgUrl,  // Use the uploaded URL
        senderId: currentUser.id,
        senderName: currentUser.username,
        timestamp: serverTimestamp(),
      });

      // Update last message in chat
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: {
          text: img ? "Sent an image" : text,
          sender: currentUser.id,
          timestamp: serverTimestamp(),
        },
      });

      // Clear states
      setText("");
      setImg(null);
      setImgPreview(null);
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  return (
    <div className="chat">
      <div className="center">
        {messages.map((message) => (
          <div
            className={`message ${message.senderId === currentUser?.id ? "own" : ""} ${isGroupChat ? "group-message" : ""}`}
            key={message.id}
          >
            {isGroupChat && message.senderId !== currentUser?.id && (
              <div className="message-sender-info">
                <img 
                  src={userAvatars[message.senderId] || "./avatar.png"}
                  alt="" 
                  className="sender-avatar"
                  onLoad={() => !userAvatars[message.senderId] && fetchUserAvatar(message.senderId)}
                />
                <span className="sender-name">{message.senderName}</span>
              </div>
            )}
            <div className="texts">
              {message.img && (
                <img 
                  src={message.img} 
                  alt="" 
                  className="message-image"
                  onClick={() => window.open(message.img, '_blank')}
                />
              )}
              {message.text && <p>{linkify(message.text)}</p>}
              <span className="timestamp">
                {message.timestamp ? format(message.timestamp.toDate()) : ''}
              </span>
            </div>
          </div>
        ))}
        <div ref={endRef}></div>
      </div>
      <div className="bottom">
        {imgPreview && (
          <div className="imagePreview">
            <img src={imgPreview} alt="Preview" />
            <button onClick={() => {
              setImg({ file: null, url: null });
              setImgPreview(null);
            }}>×</button>
          </div>
        )}
        <div className="icons">
          <label htmlFor="file">
            <img src="/download.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImage}
          />
        </div>
        <input
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : "Type a message..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}  // Add this line
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        />
        <div className="emoji">
          <img
            src="./emoji.png" 
            alt=""
            onClick={() => setOpen((prev) => !prev)}
          />
          {open && (
            <div className="picker">
              <EmojiPicker
                onEmojiClick={handleEmoji}
                theme="dark"
                height={400}
                width={300}
                previewConfig={{ showPreview: false }}
                searchDisabled={true}
                skinTonesDisabled={true}
                categories={['smileys_people', 'animals_nature', 'food_drink', 'travel_places', 'activities', 'objects', 'symbols', 'flags']}
                emojiStyle="native"  // Add this line to use native emojis
              />
            </div>
          )}
        </div>
        <button
          className="sendButton"
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;