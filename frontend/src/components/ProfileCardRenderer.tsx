import type { CurrentUser, ProfileCardItem, PublicUser } from '../types/forum';

export default function ProfileCardRenderer({
    user,
    card,
}: {
    user: CurrentUser | PublicUser;
    card?: ProfileCardItem;
}) {
    if (card?.custom && card.backgroundImage) {
        return <CustomProfileCard user={user} card={card} />;
    }
    return null;
}

function CustomProfileCard({ user, card }: { user: CurrentUser | PublicUser; card: ProfileCardItem }) {
    const layout = card.layout;
    const displayName = card.displayName || user.name || 'User';
    const avatar = card.displayPhoto || user.picture || `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(displayName)}`;
    const aspect = card.orientation === 'VERTICAL' ? 'aspect-[0.64/1]' : 'aspect-[1.58/1]';

    return (
        <div className={`profile-card-stage relative w-full max-w-[620px] overflow-hidden border border-[#2a2a2a] bg-[#111] shadow-2xl [container-type:inline-size] ${aspect}`}>
            <img src={card.backgroundImage} alt="" width={620} height={392} className="absolute inset-0 h-full w-full object-cover" />
            <img
                src={avatar}
                alt=""
                width={180}
                height={180}
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
                    fontSize: responsiveCardFont(layout.nameFontSize, 3),
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
                    fontSize: responsiveCardFont(layout.designationFontSize, 1.5),
                }}
            >
                {user.designation || 'Archive Officer'}
            </div>
        </div>
    );
}

function responsiveCardFont(value: number | undefined, fallback: number) {
    const clean = Number.isFinite(value) && value && value > 0 ? value : fallback;
    const scaled = clean * 4;
    return `clamp(${Math.max(8, clean * 7)}px, ${scaled}cqw, ${Math.max(18, clean * 24)}px)`;
}
