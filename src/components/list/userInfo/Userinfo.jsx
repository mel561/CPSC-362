import "./userInfo.css"
import { useUserStore } from "../../../lib/userStore";

const Userinfo = () => {
  const { currentUser } = useUserStore();

  return (
    <div className='userInfo'>
      <div className="user">
        <img src={currentUser.avatar || "./avatar.png"} alt="" />
        <div className="user-text">
          <span className="username">{currentUser.username}</span>
          <span className="bio">{currentUser.bio || "No bio yet"}</span>
        </div>
      </div>
      <div className="icons">
      </div>
    </div>
  )
}

export default Userinfo