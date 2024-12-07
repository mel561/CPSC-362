
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
}