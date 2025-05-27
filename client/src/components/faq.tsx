import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
    <section className="py-20 bg-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Frequently Asked Questions</h2>
          <p className="text-xl text-secondary">Everything you need to know about staying with Side Nest</p>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <button 
                onClick={() => toggleFAQ(index)}
                className="w-full text-left p-6 focus:outline-none hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{faq.question}</h3>
                  {openFAQ === index ? (
                    <ChevronUp className="text-secondary" />
                  ) : (
                    <ChevronDown className="text-secondary" />
                  )}
                </div>
              </button>
              {openFAQ === index && (
                <div className="px-6 pb-6 text-secondary">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
