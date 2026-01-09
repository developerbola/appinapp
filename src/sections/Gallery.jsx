const Gallery = () => {
  return (
    <div>
      <div className="p-6 pt-4 flex flex-col gap-2 max-w-4xl mx-auto">
        {[1, 2, 3].map((e) => (
          <div key={e}>{e}</div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;
