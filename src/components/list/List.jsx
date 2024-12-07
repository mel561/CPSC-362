import ChatList from "./chatList/Chatlist"
import "./list.css"
import Userinfo from "./userinfo/Userinfo"
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";
import { useNavigate } from "react-router-dom";

const List = () => {
  const { currentUser } = useUserStore();
  const { setChatUser } = useChatStore();
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.id)
    );

    const unSub = onSnapshot(q, (querySnapshot) => {
      const chatsArray = [];
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        // Only process non-group chats
        if (chatData.type !== "group") {
          const otherUserId = chatData.members.find(
            (memberId) => memberId !== currentUser.id
          );
          if (otherUserId) {
            chatsArray.push({
              id: doc.id,
              ...chatData,
              userId: otherUserId
            });
          }
        }
      });
      setChats(chatsArray);
    });

    return () => unSub();
  }, [currentUser.id]);

  const handleSelect = async (chat) => {
    const userDoc = await getDoc(doc(db, "users", chat.userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      setChatUser({
        id: chat.userId,
        username: userData.username,
        avatar: userData.avatar,
        blocked: userData.blocked || []
      });
    }
  };

  return (
    <div className='list'>
      <Userinfo/>
      <ChatList chats={chats} onSelect={handleSelect}/>
      <button 
        className="groupsButton" 
        onClick={() => navigate("/groups")}
      >
        Groups
      </button>
    </div>
  )
}

export default List