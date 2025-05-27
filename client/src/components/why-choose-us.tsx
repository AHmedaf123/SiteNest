import { Key, Users, MapPin, Star } from "lucide-react";

export default function WhyChooseUs() {
  const stats = [
    {
      icon: Key,
      number: "150+",
      label: "Premium Rooms",
      color: "bg-brand-coral",
      textColor: "brand-coral"
    },
    {
      icon: Users,
      number: "5,000+",
      label: "Happy Customers", 
      color: "bg-brand-teal",
      textColor: "brand-teal"
    },
    {
      icon: MapPin,
      number: "12",
      label: "Cities Served",
      color: "bg-yellow-500",
      textColor: "text-yellow-600"
    },
    {
      icon: Star,
      number: "4.9",
      label: "Average Rating",
      color: "bg-green-500", 
      textColor: "text-green-600"
    }
  ];

  return (
    <section className="py-20 bg-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Why Choose Side Nest?</h2>
          <p className="text-xl text-secondary">We're committed to providing exceptional rental experiences</p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`w-20 h-20 ${stat.color} rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle`} 
                   style={{ animationDelay: `${index * 0.2}s` }}>
                <stat.icon className="text-white text-3xl" />
              </div>
              <h3 className={`text-3xl font-bold mb-2 ${stat.textColor}`}>{stat.number}</h3>
              <p className="text-secondary">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
