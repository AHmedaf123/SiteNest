import Header from "@/components/header";
import Footer from "@/components/footer";
import RoomCalendar from "@/components/room-calendar";

export default function Calendar() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20">
        <RoomCalendar />
      </div>
      <Footer />
    </div>
  );
}
