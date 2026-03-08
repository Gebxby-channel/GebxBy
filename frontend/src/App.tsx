import './index.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import WritingPage from './pages/WritingPage';
import ReadPage from './pages/ReadPage';

export default function App() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        axios.get('http://localhost:9090/api/user/me', { withCredentials: true })
            .then(res => setUser(res.data))
            .catch(() => setUser(null));
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage user={user} />} />
                {/* Kirim data user ke Profile dan Writing Page */}
                <Route path="/profile" element={<ProfilePage user={user} />} />
                <Route path="/write" element={<WritingPage user={user} />} />
                <Route path="/read/:id" element={<ReadPage />} />
            </Routes>
        </Router>
    );
}