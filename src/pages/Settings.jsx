import { useState } from "react";
import { useUserStore } from "../lib/userStore";
import { storage, db } from "../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./settings.css";

const Settings = () => {
  const { currentUser, updateUser } = useUserStore();
  const [file, setFile] = useState(null);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio || ""); // Add bio state
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userRef = doc(db, "users", currentUser.id);
    
    try {
      if (file) {
        const storageRef = ref(storage, currentUser.id);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        uploadTask.on('state_changed', 
          null,
          (error) => console.log(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const updates = { avatar: downloadURL, username, bio };  // Add bio
            await updateDoc(userRef, updates);
            updateUser(updates);
            navigate(-1);
          }
        );
      } else {
        const updates = { username, bio };  // Add bio
        await updateDoc(userRef, updates);
        updateUser(updates);
        navigate(-1);
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="settings">
      <div className="settings-container">
        <form onSubmit={handleSubmit}>
          <h2>Profile Settings</h2>
          <div className="form-group">
            <label>Profile Picture</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <input
              type="text"
              placeholder="Your bio (max 10 characters)"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 10))}
              maxLength={10}
            />
          </div>
          <button type="submit">Save Changes</button>
        </form>
      </div>
    </div>
  );
};

export default Settings;