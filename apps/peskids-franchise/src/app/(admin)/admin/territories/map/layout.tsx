"use client";

export default function TerritoryMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout overrides the default admin padding to allow full-screen map
  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 xl:-mx-12 2xl:-mx-16 h-[calc(100vh-64px)]">
      {children}
    </div>
  );
}
