import Header from "@/components/header";
import Hero from "@/components/hero";
import About from "@/components/about";
import ApartmentCarousel from "@/components/apartment-carousel";
import WhyChooseUs from "@/components/why-choose-us";
import Reviews from "@/components/reviews";
import FAQ from "@/components/faq";
import Footer from "@/components/footer";
import Chatbot from "@/components/chatbot";
import BookingModal from "@/components/booking-modal";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <About />
      <ApartmentCarousel />
      <WhyChooseUs />
      <Reviews />
      <FAQ />
      <Footer />
      <Chatbot />
      <BookingModal />
    </div>
  );
}
