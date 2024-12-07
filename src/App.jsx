import { useEffect } from "react";
import Chat from "./components/chat/Chat";
import Detail from "./components/detail/Detail";
import List from "./components/list/List";
import Login from "./components/login/Login";
import Notification from "./components/notification/Notification";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useUserStore } from "./lib/userStore";
import { useChatStore } from "./lib/chatStore";
import { Routes, Route } from "react-router-dom";
import CreateGroup from "./components/detail/createGroup/Creategroup";
import Groups from "./components/groups/Groups";
import Settings from "./pages/Settings";

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();
  const { chatId } = useChatStore();

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
    });

    return () => {
      unSub();
    };
  }, [fetchUserInfo]);

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      {currentUser ? (
        <Routes>
          <Route
            path="/"
            element={
              <>
                <List />
                {chatId && <Chat />}
                {chatId && <Detail />}
              </>
            }
          />
          <Route path="/create-group" element={<CreateGroup />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      ) : (
        <Login />
      )}
      <Notification />
    </div>
  );
};

export default App;