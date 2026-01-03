const Player = () => {
  return (
    <div className="widget fixed top-[500px] left-[100px] bg-slate-800/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
      <h1 className="text-5xl font-extralight text-white tracking-tight">
        Tailwind <span className="text-blue-400 font-bold">Widget</span>
      </h1>
      <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest font-medium">
        Powered by Tailwind CSS 4
      </p>
    </div>
  );
};

export default Player;
