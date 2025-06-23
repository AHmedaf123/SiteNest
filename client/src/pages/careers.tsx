import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";
import Header from "@/components/header";
import {
  Users,
  TrendingUp,
  DollarSign,
  Globe,
  CheckCircle,
  ArrowLeft,
  Briefcase,
  Target,
  Award,
  MessageSquare
} from "lucide-react";

interface ApplicationStatus {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  application?: any;
}

export default function Careers() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useRealAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>({ status: 'none' });
  const [formData, setFormData] = useState({
    experience: '',
    motivation: '',
    marketingPlan: '',
    socialMediaLinks: ''
  });

  // Check application status on load
  useEffect(() => {
    if (isAuthenticated) {
      checkApplicationStatus();
    }
  }, [isAuthenticated]);

  const checkApplicationStatus = async () => {
    try {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/affiliate/applications/my-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplicationStatus(data);
      }
    } catch (error) {
      console.error('Failed to check application status:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to apply for the affiliate program.",
        variant: "destructive"
      });
      return;
    }

    // Client-side validation
    const validationErrors = [];
    if (formData.experience.length < 10) {
      validationErrors.push("• Experience: Please provide at least 10 characters describing your marketing/sales experience");
    }
    if (formData.motivation.length < 20) {
      validationErrors.push("• Motivation: Please provide at least 20 characters explaining your motivation");
    }
    if (formData.marketingPlan.length < 30) {
      validationErrors.push("• Marketing Plan: Please provide at least 30 characters describing your marketing strategy");
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Please Complete Required Fields",
        description: `Please fix the following issues:\n\n${validationErrors.join('\n')}`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/affiliate/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
          phone: user?.phone || ''
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Application Submitted!",
          description: "Your affiliate application has been submitted successfully. We'll review it and get back to you soon.",
        });
        
        // Reset form and update status
        setFormData({
          experience: '',
          motivation: '',
          marketingPlan: '',
          socialMediaLinks: ''
        });
        
        checkApplicationStatus();
      } else {
        // Handle validation errors with specific details
        let errorMessage = data.error || "Failed to submit application. Please try again.";

        if (data.error === "Validation failed" && data.details) {
          const validationErrors = data.details.map((detail: any) => {
            if (detail.path[0] === 'experience') {
              return "• Experience: Please provide at least 10 characters describing your marketing/sales experience";
            } else if (detail.path[0] === 'motivation') {
              return "• Motivation: Please provide at least 20 characters explaining your motivation";
            } else if (detail.path[0] === 'marketingPlan') {
              return "• Marketing Plan: Please provide at least 30 characters describing your marketing strategy";
            } else if (detail.path[0] === 'phone') {
              return "• Phone: Please provide a valid Pakistani phone number";
            } else if (detail.path[0] === 'fullName') {
              return "• Name: Please complete your profile with your full name";
            } else if (detail.path[0] === 'email') {
              return "• Email: Please provide a valid email address";
            }
            return `• ${detail.path[0]}: ${detail.message}`;
          }).join('\n');

          errorMessage = `Please fix the following issues:\n\n${validationErrors}`;
        }

        toast({
          title: "Submission Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Application submission error:', error);
      toast({
        title: "Error",
        description: "An error occurred while submitting your application.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderApplicationStatus = () => {
    switch (applicationStatus.status) {
      case 'pending':
        return (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-800">Application Under Review</h3>
                  <p className="text-yellow-700">Your affiliate application is being reviewed by our team. We'll notify you once a decision is made.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'approved':
        return (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Congratulations! You're an Affiliate</h3>
                  <p className="text-green-700">Your application has been approved. You can now access your affiliate dashboard and start earning commissions.</p>
                  <Button 
                    onClick={() => setLocation('/affiliate-dashboard')} 
                    className="mt-3 bg-green-600 hover:bg-green-700"
                  >
                    Go to Affiliate Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'rejected':
        return (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Application Not Approved</h3>
                  <p className="text-red-700">Unfortunately, your affiliate application was not approved at this time. You can reapply after addressing the feedback.</p>
                  {applicationStatus.application?.reviewNotes && (
                    <p className="text-red-600 mt-2 text-sm">
                      <strong>Feedback:</strong> {applicationStatus.application.reviewNotes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setLocation('/')}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center space-x-3">
                <Briefcase className="w-10 h-10 text-sitenest-primary" />
                <span>Join Our Affiliate Program</span>
              </h1>
              <p className="text-gray-600 mt-2">Partner with SiteNest and earn commissions by promoting premium accommodations</p>
            </div>
          </div>
        </div>

        {/* Application Status */}
        {renderApplicationStatus()}

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-sitenest-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Competitive Commissions</h3>
              <p className="text-gray-600">Earn up to 10% commission on every successful booking through your referral links.</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-sitenest-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-gray-600">Track your performance with detailed analytics and insights on clicks, conversions, and earnings.</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Marketing Support</h3>
              <p className="text-gray-600">Get access to marketing materials, promotional content, and dedicated support from our team.</p>
            </CardContent>
          </Card>
        </div>

        {/* Application Form */}
        {applicationStatus.status === 'none' || applicationStatus.status === 'rejected' ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Affiliate Application</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Info Display */}
                {user && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">Application Details</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 font-medium">{user.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2 font-medium">{user.phone || 'Not provided'}</span>
                      </div>
                    </div>
                    {(!user.firstName || !user.lastName || !user.phone) && (
                      <p className="text-amber-600 text-sm mt-2">
                        💡 Complete your profile information for a better application experience.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="experience">Marketing/Sales Experience *</Label>
                  <Textarea
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    required
                    placeholder="Describe your previous experience in marketing, sales, or affiliate marketing..."
                    rows={3}
                  />
                  <p className={`text-sm mt-1 ${formData.experience.length >= 10 ? 'text-green-600' : 'text-gray-500'}`}>
                    {formData.experience.length}/10 characters minimum {formData.experience.length >= 10 ? '✓' : ''}
                  </p>
                </div>

                <div>
                  <Label htmlFor="motivation">Why do you want to become an affiliate? *</Label>
                  <Textarea
                    id="motivation"
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    required
                    placeholder="Tell us what motivates you to join our affiliate program..."
                    rows={3}
                  />
                  <p className={`text-sm mt-1 ${formData.motivation.length >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
                    {formData.motivation.length}/20 characters minimum {formData.motivation.length >= 20 ? '✓' : ''}
                  </p>
                </div>

                <div>
                  <Label htmlFor="marketingPlan">Marketing Strategy *</Label>
                  <Textarea
                    id="marketingPlan"
                    name="marketingPlan"
                    value={formData.marketingPlan}
                    onChange={handleInputChange}
                    required
                    placeholder="How do you plan to promote SiteNest? What channels will you use?"
                    rows={4}
                  />
                  <p className={`text-sm mt-1 ${formData.marketingPlan.length >= 30 ? 'text-green-600' : 'text-gray-500'}`}>
                    {formData.marketingPlan.length}/30 characters minimum {formData.marketingPlan.length >= 30 ? '✓' : ''}
                  </p>
                </div>

                <div>
                  <Label htmlFor="socialMediaLinks">Social Media Links (Optional)</Label>
                  <Textarea
                    id="socialMediaLinks"
                    name="socialMediaLinks"
                    value={formData.socialMediaLinks}
                    onChange={handleInputChange}
                    placeholder="Share your social media profiles, website, or other relevant links..."
                    rows={2}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !isAuthenticated || formData.experience.length < 10 || formData.motivation.length < 20 || formData.marketingPlan.length < 30}
                  className="w-full bg-sitenest-primary hover:bg-sitenest-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>

                {!isAuthenticated && (
                  <p className="text-center text-gray-600 text-sm">
                    Please <button onClick={() => setLocation('/signin')} className="text-sitenest-primary hover:underline">sign in</button> to submit your application.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
