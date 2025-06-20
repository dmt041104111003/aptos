import NavBar from '@/components/ui2/Navbar';
import Hero from '@/components/ui2/Hero';
import About from '@/components/ui2/About';
import Features from '@/components/ui2/Features';
import Contact from '@/components/ui2/Contact';
import Footer from '@/components/ui2/Footer';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#2a0b4d] to-[#1a052e]">
      <NavBar />
      <div className="flex-1 flex flex-col">
        <Hero />
        <section id="about" className="py-20">
          <About />
        </section>
        <section id="features" className="py-20">
          <Features />
        </section>

        <section id="contact" className="py-20">
          <Contact />
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
