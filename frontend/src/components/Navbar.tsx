import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/api';
import type { CurrentUser } from '../types/forum';
import DesktopNavbar from './DesktopNavbar';
import MobileSidebar from './MobileSidebar';
import { buildNavigationItems } from './navigationItems';

interface NavbarProps {
    user: CurrentUser | null;
    onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
    const navigate = useNavigate();
    const menuItems = buildNavigationItems(user);

    const handleTerminate = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            await logout();
        } finally {
            onLogout();
            navigate('/', { replace: true });
        }
    };

    return (
        <>
            <DesktopNavbar user={user} menuItems={menuItems} onTerminate={handleTerminate} />
            <MobileSidebar user={user} menuItems={menuItems} onTerminate={handleTerminate} />
        </>
    );
}
