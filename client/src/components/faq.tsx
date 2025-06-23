import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FAQ() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I book an apartment?",
      answer: "You can book through our website, mobile app, or by contacting our customer service. Our chatbot can also help you check availability and start the booking process."
    },
    {
      question: "What is included in the rental?",
      answer: "All apartments come fully furnished with kitchen appliances, WiFi, cleaning supplies, and basic amenities. Utilities are included in the rental price."
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, we offer flexible cancellation policies. Free cancellation up to 24 hours before check-in for most bookings."
    },
    {
      question: "Do you provide 24/7 support?",
      answer: "Yes, our customer support team is available 24/7 to assist with any questions or emergencies during your stay."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-heading mb-6 text-primary">Frequently Asked Questions</h2>
          <p className="body-elegant text-xl text-secondary max-w-2xl mx-auto">Everything you need to know about staying with SiteNest in Bahria Enclave, Islamabad</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="glass-card rounded-xl shadow-lg overflow-hidden border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left p-6 focus:outline-none hover:bg-sitenest-warm-white/50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold font-playfair text-primary">{faq.question}</h3>
                  <motion.div
                    animate={{ rotate: openFAQ === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="text-sitenest-blue" />
                  </motion.div>
                </div>
              </button>
              <AnimatePresence>
                {openFAQ === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 text-secondary leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
