export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Dynamic Header import can go here if needed */}
            <main className="flex-1 w-full max-w-md mx-auto sm:max-w-7xl sm:px-6 lg:px-8">
                {children}
            </main>
            {/* Dynamic Bottom Nav import can go here if needed */}
        </div>
    );
}
