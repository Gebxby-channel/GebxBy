import './index.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import WritingPage from './pages/WritingPage';
import ReadPage from './pages/ReadPage';
import Navbar from './components/Navbar';
import OtherProfilePage from './pages/OtherProfilePage';

interface UserProps {
    name: string;
    email: string;
    picture: string;
    userID: string;
}

export default function App() {

    const [user, setUser] = useState<UserProps | null>(null);

    useEffect(() => {
        axios.get('https://federal-wasp-gebxby-18a594b4.koyeb.app/api/user/me', { withCredentials: true })
            .then(res => setUser(res.data))
            .catch(() => setUser(null));
    }, []);

    return (
        <Router>
            <Navbar user={user} />
            <Routes>
                <Route path="/" element={<HomePage user={user}/>} />
                {/* Kirim data user ke Profile dan Writing Page */}
                <Route path="/profile" element={<ProfilePage user={user} />} />
                <Route path="/write" element={<WritingPage user={user} />} />
                <Route path="/read/:id" element={<ReadPage />} />
                <Route path="/profile/:userId" element={<OtherProfilePage user={user} />} />
            </Routes>
        </Router>
    );
}