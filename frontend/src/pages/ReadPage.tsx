// ReadPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
export default function ReadPage() {
    const { id } = useParams(); // INI YANG NANGKAP ID DARI URL
    const [content, setContent] = useState<any>(null);


    const navigateBack = useNavigate();

    useEffect(() => {
        // Baru di sini kamu panggil pakai ID
        if (id) {
            axios.get(`http://localhost:9090/content/${id}`)
                .then(res => setContent(res.data))
                .catch(err => console.error("Gagal ambil detail", err));
        }
    }, [id]);

    if (!content) return <div>Accessing Database...</div>;

    return (
        <div className="read-container">
            {/* Tombol kembali yang elegan */}
            <button
                onClick={() => navigateBack('/')}
                style={{ color: '#8B0000', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '40px' }}
            >
                [ ← BACK_TO_DATABASE ]
            </button>

            <h1 style={{ color: '#ff0000', fontSize: '2.8rem', marginBottom: '10px' }}>{content.head}</h1>
            <p style={{ color: '#666', marginBottom: '50px' }}>LOG_FILE_ID: {id}</p>

            <div className="text-body">
                {content.paragrafs}
            </div>
        </div>
    );
}