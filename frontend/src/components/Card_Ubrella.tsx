import type { CurrentUser, PublicUser } from '../types/forum';

type ProfileStats = {
    writings: number;
    up: number;
    comments: number;
    views: number;
};

export default function Card_Ubrella({ user, stats }: { user: CurrentUser | PublicUser; stats: ProfileStats }) {
    const avatar = user.picture || `https://ui-avatars.com/api/?background=ffffff&color=111&name=${encodeURIComponent(user.name || 'User')}`;
    const clearance = (stats.up >= 1000 ? 'S' : stats.up >= 250 ? 'A' : stats.up >= 75 ? 'B' : 'C');

    return (
        <div className="relative aspect-[1.58/1] w-full max-w-[520px] overflow-hidden rounded-[2px] border-[3px] border-black bg-white p-[3%] font-mono text-black shadow-[12px_16px_22px_rgba(0,0,0,0.38)]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0_92%,#d60000_92%_96%,#111_96%)] opacity-90" />
            <div className="relative z-10 grid h-full grid-cols-[34%_36%_30%] grid-rows-[18%_42%_24%_16%] gap-[1.2%]">
                <div className="col-span-3 flex items-center gap-2 bg-black px-2 text-white">
                    <UmbrellaMark small />
                    <span className="text-[clamp(10px,2.8vw,18px)] font-black uppercase tracking-[0.18em]">Umbrella Corporation</span>
                </div>

                <section className="row-span-2 border-[3px] border-[#d60000] p-2">
                    <div className="flex h-full flex-col justify-between">
                        <span className="text-[clamp(9px,1.8vw,13px)] font-black uppercase leading-none">Security</span>
                        <span className="text-[clamp(68px,14vw,120px)] font-black leading-none">{clearance}</span>
                        <span className="text-[clamp(10px,2vw,16px)] font-black uppercase leading-none tracking-tight">Clearance</span>
                        <div className="h-6 bg-[repeating-linear-gradient(90deg,#111_0_3px,#fff_3px_5px,#111_5px_8px,#fff_8px_12px)]" />
                    </div>
                </section>

                <section className="border-2 border-black p-2 text-center">
                    <p className="m-0 text-[clamp(8px,1.5vw,12px)] font-black uppercase">Raccoon City</p>
                    <div className="mx-auto my-1 flex h-[42%] w-[45%] items-center justify-center">
                        <UmbrellaMark />
                    </div>
                    <p className="m-0 text-[clamp(9px,1.8vw,14px)] font-black uppercase leading-none">Bio Weapons<br />Division</p>
                    <p className="m-0 mt-1 text-[clamp(7px,1.2vw,10px)] font-black uppercase">ID: {compactId(user.userID)}</p>
                </section>

                <section className="row-span-2 border-2 border-black p-2">
                    <div className="flex h-full flex-col items-center justify-between">
                        <div className="relative flex aspect-square w-[72%] items-center justify-center overflow-hidden rounded-full border-[3px] border-dashed border-black bg-white">
                            <img src={avatar} alt="" className="h-full w-full object-cover grayscale" referrerPolicy="no-referrer" />
                        </div>
                        <p className="m-0 text-center text-[clamp(8px,1.3vw,11px)] font-black uppercase leading-none">Your Face Here</p>
                    </div>
                </section>

                <section className="border-2 border-black p-2">
                    <p className="m-0 text-[clamp(7px,1.2vw,10px)] font-black uppercase">Archives</p>
                    <div className="mt-1 grid grid-cols-2 gap-1 text-[clamp(7px,1.2vw,10px)] font-black uppercase">
                        <span>WRI {stats.writings}</span>
                        <span>UP {stats.up}</span>
                        <span>COM {stats.comments}</span>
                        <span>VIE {stats.views}</span>
                    </div>
                </section>

                <section className="col-span-2 flex items-center border-2 border-black px-2">
                    <p className="m-0 truncate text-[clamp(14px,3vw,24px)] font-black uppercase tracking-[0.08em]">{user.name || 'Your Name Here'}</p>
                </section>

                <div className="col-span-3 flex items-center justify-between bg-black px-2 text-white">
                    <span className="text-[clamp(9px,1.7vw,14px)] font-black uppercase">696:07 / Our Business Is Life Itself</span>
                    <UmbrellaMark small />
                </div>
            </div>
        </div>
    );
}

function UmbrellaMark({ small = false }: { small?: boolean }) {
    return (
        <span className={`grid ${small ? 'h-7 w-7' : 'h-14 w-14'} grid-cols-2 grid-rows-2 overflow-hidden rounded-full border border-black bg-white`}>
            <span className="bg-[#d60000]" />
            <span className="bg-white" />
            <span className="bg-white" />
            <span className="bg-[#d60000]" />
        </span>
    );
}

function compactId(id?: string) {
    return (id || '698-001').replaceAll('-', '').slice(0, 6).toUpperCase() || '698001';
}
