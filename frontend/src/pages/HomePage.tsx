import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import banner from '../assets/banner.png';

export default function HomePage() {
    const [articles, setArticles] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('http://localhost:9090/content/all-content')
            .then(res => setArticles(Array.isArray(res.data) ? res.data : []));
    }, []);

    return (
        <div className="main-layout">
            {/* 1. Banner ala YouTube */}
            <div className="banner-container">
                <img src={banner} alt="GebxBy"  className="banner-container"/>
            </div>

            {/* 2. Header Identitas */}
            <header className="channel-header">
                <img src={logo} alt="GebxBy" className="profile-pic" />
                <div className="channel-details">
                    <h1>GebxBy Blog</h1>
                    <p className="channel-stats">@GebxBy</p>
                    <p className="bg-red-500"> Active articles • {articles.length}  </p>
                    <p style={{ color: '#aaa', maxWidth: '600px', fontSize: '14px' }}>
                        Hi Guys, ini adalah Website untuk sharing tulisan-tulisan gw yang bisa jadi hint untuk next video; tapi tidak semua tulisan disini bakal dibuatin video yah guys :) semoga betah baca baca di blog pribadi gw yah, salam literasi.
                    </p>
                    <a href="https://www.youtube.com/@GebxBy" target="_blank" rel="noopener noreferrer">
                        <button style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', marginTop: '16px', cursor: 'pointer' }}>
                            Go To Channel
                        </button>
                    </a>
                </div>
            </header>

            <div style={{ borderBottom: '1px solid #333', margin: '16px 0' }}></div>

            {/* 3. Daftar Artikel ala Video List */}
            <div className="video-row">
                {articles.map((art) => (
                    <div key={art.idContent} className="video-card" onClick={() => navigate(`/read/${art.idContent}`)}>
                        <div className="thumbnail-mock">
                            <img src={logo} style={{ width: '100%', opacity: 0.3 }} alt="thumb" />
                        </div>
                        <div className="video-info">
                            <h2>{art.head}</h2>
                            <p className="video-meta">Penulis : {art}</p>
                            <p style={{ color: '#aaa', fontSize: '14px', marginTop: '8px' }}>
                                {art.paragrafs.substring(0, 150)}...
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}