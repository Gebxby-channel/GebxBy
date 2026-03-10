import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// import logo from '../assets/logo.png';

export default function HomePage({ user }: { user: any }) {
    const [articles, setArticles] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('http://localhost:9090/content/all-content', { withCredentials: true })
            .then(res => setArticles(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error("Gagal ambil artikel:", err));
    }, []);

    return (
        <div className="main-layout">
            {/* Header Simple */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #333' }}>
                <div>
                    <h1 style={{ margin: 0 }}>GebxBy Blog</h1>
                    <p style={{ margin: 0, color: '#aaa' }}>Explore all contents</p>
                </div>

                <div>
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <img src={user.picture} alt="Profile" style={{ width: '40px', borderRadius: '50%' }} referrerPolicy="no-referrer" />
                            <button onClick={() => navigate('/profile')} style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
                                My Profile
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => window.location.href = 'http://localhost:9090/oauth2/authorization/google'} style={{ background: '#4285F4', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Login with Google
                        </button>
                    )}
                </div>
            </header>

            {/* Menampilkan SEMUA Artikel */}
            <div className="video-row" style={{ padding: '20px' }}>
                {articles.map((art) => (
                    <div key={art.idContent} className="video-card" onClick={() => navigate(`/read/${art.idContent}`)} style={{ cursor: 'pointer', border: '1px solid #444', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                        <h2>{art.head}</h2>
                        <p style={{ color: '#aaa', fontSize: '14px' }}>Penulis : {art.user?.name || "Anonymous"}</p>
                        <p style={{ color: '#ccc', marginTop: '8px' }}>
                            {art.paragrafs ? art.paragrafs.substring(0, 150) : ""}...
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}