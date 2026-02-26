// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WritingPage from './pages/WritingPage'; // Import file yang baru kita buat
import AdminPage from './pages/AdminPage';
import ReadPage from './pages/ReadPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/write" element={<WritingPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/read/:id" element={<ReadPage />} />
            </Routes>
        </Router>
    );
}
export default App;