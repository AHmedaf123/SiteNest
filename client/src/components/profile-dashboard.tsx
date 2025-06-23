import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Camera,
  Lock,
  Shield,
  CheckCircle,
  AlertCircle,
  Edit3,
  Save,
  X,
  ArrowLeft,
  MessageCircle,
  Send,
  Upload,
  Loader2
} from "lucide-react";

export default function ProfileDashboard() {
  const [, setLocation] = useLocation();
  const { user, updateProfile, changePassword, uploadProfilePicture, logout, resendVerification, verifyPhone, verifyEmail } = useRealAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    cnic: user?.cnic || '',
    phone: user?.phone || '',
    country: user?.country || '',
    address: user?.address || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Sync profile data with user data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        cnic: user.cnic || '',
        phone: user.phone || '',
        country: user.country || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    setIsLoading(true);

    const result = await updateProfile(profileData);

    if (result.success) {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    } else {
      toast({
        title: "Update Failed",
        description: result.error || "Failed to update profile.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);

    if (result.success) {
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } else {
      toast({
        title: "Password Change Failed",
        description: result.error || "Failed to change password.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a JPG, PNG, or WebP image.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const result = await uploadProfilePicture(file);

    if (result.success) {
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      });
    } else {
      toast({
        title: "Upload Failed",
        description: result.error || "Failed to upload profile picture.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handleSendEmailVerification = async () => {
    setIsVerifyingEmail(true);

    const result = await resendVerification('email');

    if (result.success) {
      toast({
        title: "Verification Code Sent",
        description: "A 6-digit code has been sent to your email address.",
      });
      setShowEmailVerification(true);
    } else {
      toast({
        title: "Failed to Send Code",
        description: result.error || "Failed to send email verification code.",
        variant: "destructive"
      });
    }

    setIsVerifyingEmail(false);
  };

  const handleSendWhatsAppVerification = async () => {
    if (!user?.phone) {
      toast({
        title: "No Phone Number",
        description: "Please add a phone number to your profile first.",
        variant: "destructive"
      });
      return;
    }

    setIsVerifyingPhone(true);

    const result = await resendVerification('phone');

    if (result.success) {
      toast({
        title: "Verification Code Sent",
        description: "A 6-digit code has been sent to your WhatsApp.",
      });
      setShowPhoneVerification(true);
    } else {
      toast({
        title: "Failed to Send Code",
        description: result.error || "Failed to send WhatsApp verification code.",
        variant: "destructive"
      });
    }

    setIsVerifyingPhone(false);
  };

  const handleVerifyEmailCode = async () => {
    if (emailVerificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }

    setIsVerifyingEmail(true);

    const result = await verifyEmail(emailVerificationCode);

    if (result.success) {
      toast({
        title: "Email Verified",
        description: "Your email address has been verified successfully!",
      });
      setShowEmailVerification(false);
      setEmailVerificationCode('');
    } else {
      toast({
        title: "Verification Failed",
        description: result.error || "Invalid verification code.",
        variant: "destructive"
      });
    }

    setIsVerifyingEmail(false);
  };

  const handleVerifyPhoneCode = async () => {
    if (phoneVerificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }

    setIsVerifyingPhone(true);

    const result = await verifyPhone(phoneVerificationCode);

    if (result.success) {
      toast({
        title: "Phone Verified",
        description: "Your WhatsApp number has been verified successfully!",
      });
      setShowPhoneVerification(false);
      setPhoneVerificationCode('');
    } else {
      toast({
        title: "Verification Failed",
        description: result.error || "Invalid verification code.",
        variant: "destructive"
      });
    }

    setIsVerifyingPhone(false);
  };

  const openWhatsAppJoin = () => {
    const whatsappUrl = `https://wa.me/14155238886?text=${encodeURIComponent('join sitenest')}`;
    window.open(whatsappUrl, '_blank');
  };

  const getVerificationStatus = () => {
    const emailVerified = user?.isEmailVerified;
    const phoneVerified = user?.isPhoneVerified;

    if (emailVerified && phoneVerified) {
      return { status: 'verified', text: 'Fully Verified', icon: CheckCircle, color: 'text-green-600' };
    } else if (emailVerified || phoneVerified) {
      return { status: 'partial', text: 'Partially Verified', icon: AlertCircle, color: 'text-yellow-600' };
    } else {
      return { status: 'unverified', text: 'Not Verified', icon: AlertCircle, color: 'text-red-600' };
    }
  };

  const verificationStatus = getVerificationStatus();
  const StatusIcon = verificationStatus.icon;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-3xl font-bold text-gray-900">Profile Dashboard</h1>
            <p className="text-gray-600">Manage your SiteNest account settings</p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          className="text-red-600 border-red-600 hover:bg-red-50"
        >
          Sign Out
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300 group-hover:border-sitenest-blue transition-colors">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-sitenest-blue text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-gray-600">{user.email}</p>
                  <div className={`flex items-center space-x-1 mt-1 ${verificationStatus.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm">{verificationStatus.text}</span>
                  </div>
                  <div className="mt-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="text-sitenest-blue border-sitenest-blue hover:bg-sitenest-blue hover:text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {user.profileImageUrl ? 'Change Picture' : 'Upload Picture'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, or WebP. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Summary (when not editing) */}
              {!isEditing && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Full Name</span>
                        <p className="text-gray-900">{user.firstName} {user.lastName}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Email</span>
                        <p className="text-gray-900">{user.email}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">CNIC</span>
                        <p className="text-gray-900">{user.cnic || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Phone Number</span>
                        <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Country</span>
                        <p className="text-gray-900">{user.country || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Address</span>
                        <p className="text-gray-900">{user.address || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-sm font-medium text-gray-500">Account Type</span>
                    <p className="text-gray-900 capitalize">{user.authProvider} Account</p>
                  </div>
                </div>
              )}

              {/* Profile Form (when editing) */}
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnic">CNIC</Label>
                    <Input
                      id="cnic"
                      value={profileData.cnic}
                      onChange={(e) => setProfileData(prev => ({ ...prev, cnic: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                      placeholder="1234567890123"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="03001234567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profileData.country}
                      onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="Pakistan"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profileData.address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Your complete address"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-sitenest-blue hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        setProfileData({
                          firstName: user?.firstName || '',
                          lastName: user?.lastName || '',
                          cnic: user?.cnic || '',
                          phone: user?.phone || '',
                          country: user?.country || '',
                          address: user?.address || ''
                        });
                      }}
                      variant="outline"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Security Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Password</h3>
                    <p className="text-sm text-gray-600">
                      {user.authProvider === 'google'
                        ? 'You signed in with Google. Password change is not available.'
                        : 'Change your account password'
                      }
                    </p>
                  </div>
                  {user.authProvider !== 'google' && (
                    <Button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      variant="outline"
                    >
                      Change Password
                    </Button>
                  )}
                </div>

                {showPasswordForm && user.authProvider !== 'google' && (
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                      </div>

                      <div className="flex space-x-3">
                        <Button
                          onClick={handlePasswordChange}
                          disabled={isLoading}
                          className="bg-sitenest-blue hover:bg-blue-700"
                        >
                          {isLoading ? 'Changing...' : 'Change Password'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowPasswordForm(false);
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Account Verification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-semibold">Email Verification</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-2 ${user.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                      {user.isEmailVerified ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-medium">Not Verified</span>
                        </>
                      )}
                    </div>
                  </div>

                  {!user.isEmailVerified && (
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleSendEmailVerification}
                          disabled={isVerifyingEmail}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isVerifyingEmail ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Verification Code
                            </>
                          )}
                        </Button>
                      </div>

                      {showEmailVerification && (
                        <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
                          <div>
                            <Label htmlFor="emailCode" className="text-sm font-medium">
                              Enter 6-digit email code
                            </Label>
                            <Input
                              id="emailCode"
                              value={emailVerificationCode}
                              onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="123456"
                              className="text-center text-lg tracking-widest mt-1"
                              maxLength={6}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleVerifyEmailCode}
                              disabled={isVerifyingEmail || emailVerificationCode.length !== 6}
                              className="bg-sitenest-blue hover:bg-blue-700"
                            >
                              {isVerifyingEmail ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify Code'
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowEmailVerification(false);
                                setEmailVerificationCode('');
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-semibold">WhatsApp Verification</h3>
                        <p className="text-sm text-gray-600">{user.phone || 'No phone number'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-2 ${user.isPhoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                      {user.isPhoneVerified ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-medium">Not Verified</span>
                        </>
                      )}
                    </div>
                  </div>

                  {!user.isPhoneVerified && user.phone && (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Setup Required</span>
                        </div>
                        <p className="text-xs text-blue-700 mb-2">
                          First, join our WhatsApp sandbox by sending "join sitenest" to +14155238886
                        </p>
                        <Button
                          onClick={openWhatsAppJoin}
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Open WhatsApp
                        </Button>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          onClick={handleSendWhatsAppVerification}
                          disabled={isVerifyingPhone}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isVerifyingPhone ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Verification Code
                            </>
                          )}
                        </Button>
                      </div>

                      {showPhoneVerification && (
                        <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
                          <div>
                            <Label htmlFor="phoneCode" className="text-sm font-medium">
                              Enter 6-digit WhatsApp code
                            </Label>
                            <Input
                              id="phoneCode"
                              value={phoneVerificationCode}
                              onChange={(e) => setPhoneVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="123456"
                              className="text-center text-lg tracking-widest mt-1"
                              maxLength={6}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleVerifyPhoneCode}
                              disabled={isVerifyingPhone || phoneVerificationCode.length !== 6}
                              className="bg-sitenest-blue hover:bg-blue-700"
                            >
                              {isVerifyingPhone ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify Code'
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowPhoneVerification(false);
                                setPhoneVerificationCode('');
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!user.phone && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        Please add a phone number to your profile to enable WhatsApp verification.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {(!user.isEmailVerified || !user.isPhoneVerified) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-800">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Verification Required</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Complete your account verification to access all SiteNest features and ensure account security.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
