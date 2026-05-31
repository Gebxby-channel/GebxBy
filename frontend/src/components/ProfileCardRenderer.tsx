import type { CurrentUser, ProfileCardItem, PublicUser } from '../types/forum';
import Card_Ubrella from './Card_Ubrella';

type ProfileStats = {
    writings: number;
    up: number;
    comments: number;
    views: number;
};

export default function ProfileCardRenderer({
    user,
    card,
    stats,
}: {
    user: CurrentUser | PublicUser;
    card?: ProfileCardItem;
    stats: ProfileStats;
}) {
    if (card?.id === 'DEFAULT:UMBRELLA' || card?.code === 'DEFAULT:UMBRELLA') {
        return <Card_Ubrella user={user} stats={stats} />;
    }
    if (card?.custom && card.backgroundImage) {
        return <CustomProfileCard user={user} card={card} stats={stats} />;
    }
    return null;
}

function CustomProfileCard({ user, card, stats }: { user: CurrentUser | PublicUser; card: ProfileCardItem; stats: ProfileStats }) {
    const layout = card.layout;
    const displayName = card.displayName || user.name || 'User';
    const avatar = card.displayPhoto || user.picture || `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(displayName)}`;
    const aspect = card.orientation === 'VERTICAL' ? 'aspect-[0.64/1]' : 'aspect-[1.58/1]';

    return (
        <div className={`relative w-full max-w-[520px] overflow-hidden border border-[#2a2a2a] bg-[#111] shadow-2xl ${aspect}`}>
            <img src={card.backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <img
                src={avatar}
                alt=""
                className="absolute object-cover"
                style={{
                    left: `${layout.photoX}%`,
                    top: `${layout.photoY}%`,
                    width: `${layout.photoW}%`,
                    height: `${layout.photoH}%`,
                }}
                referrerPolicy="no-referrer"
            />
            <div
                className="absolute overflow-hidden font-mono font-black uppercase leading-none"
                style={{
                    left: `${layout.nameX}%`,
                    top: `${layout.nameY}%`,
                    width: `${layout.nameW}%`,
                    height: `${layout.nameH}%`,
                    color: layout.textColor,
                    fontSize: `${layout.nameFontSize || 3}cqw`,
                }}
            >
                {displayName}
            </div>
            <div
                className="absolute overflow-hidden font-mono font-black uppercase leading-none"
                style={{
                    left: `${layout.designationX}%`,
                    top: `${layout.designationY}%`,
                    width: `${layout.designationW}%`,
                    height: `${layout.designationH}%`,
                    color: layout.textColor,
                    fontSize: `${layout.designationFontSize || 1.5}cqw`,
                }}
            >
                {user.designation || 'Archive Officer'}
            </div>
            <div
                className="absolute grid grid-cols-2 gap-1 font-mono font-black uppercase leading-none"
                style={{
                    left: `${layout.statsX}%`,
                    top: `${layout.statsY}%`,
                    width: `${layout.statsW}%`,
                    height: `${layout.statsH}%`,
                    color: layout.accentColor,
                    fontSize: `${layout.statsFontSize || 1.2}cqw`,
                }}
            >
                <span>W {stats.writings}</span>
                <span>U {stats.up}</span>
                <span>C {stats.comments}</span>
                <span>V {stats.views}</span>
            </div>
        </div>
    );
}
