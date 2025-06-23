import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Clock, 
  Star, 
  Bot,
  CheckCircle,
  AlertCircle,
  Heart,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ChatbotMetrics {
  totalConversations: number;
  activeConversations: number;
  averageResponseTime: number;
  userSatisfactionScore: number;
  bookingConversionRate: number;
  topIntents: Array<{ intent: string; count: number; percentage: number }>;
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
    urgent: number;
  };
  hourlyActivity: Array<{ hour: number; conversations: number }>;
  recentConversations: Array<{
    id: string;
    sessionId: string;
    userMessage: string;
    botResponse: string;
    intent: string;
    sentiment: string;
    timestamp: string;
    satisfaction?: number;
  }>;
}

export default function ChatbotAnalytics() {
  const [metrics, setMetrics] = useState<ChatbotMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", `/api/admin/chatbot-analytics?range=${timeRange}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Failed to fetch chatbot metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Chatbot Analytics</h2>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">No Analytics Data</h3>
        <p className="text-gray-500">Start some conversations to see analytics!</p>
      </div>
    );
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'urgent': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Heart className="w-3 h-3" />;
      case 'negative': return <AlertCircle className="w-3 h-3" />;
      case 'urgent': return <Zap className="w-3 h-3" />;
      default: return <MessageCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Bot className="w-8 h-8 text-sitenest-primary" />
            <span>Chatbot Analytics</span>
          </h2>
          <p className="text-gray-600">Monitor AI assistant performance and user interactions</p>
        </div>
        <div className="flex space-x-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? "bg-sitenest-primary" : ""}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalConversations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeConversations} active now
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageResponseTime.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              Target: &lt;2s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.userSatisfactionScore.toFixed(1)}/5</div>
            <Progress value={metrics.userSatisfactionScore * 20} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.bookingConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Target: &gt;15%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Intents */}
        <Card>
          <CardHeader>
            <CardTitle>Top User Intents</CardTitle>
            <CardDescription>Most common user requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topIntents.map((intent, index) => (
                <div key={intent.intent} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium capitalize">
                      {intent.intent.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={intent.percentage} className="w-20" />
                    <span className="text-sm text-gray-600 w-12">
                      {intent.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
            <CardDescription>User emotion distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.sentimentAnalysis).map(([sentiment, count]) => (
                <div key={sentiment} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getSentimentColor(sentiment)}>
                      {getSentimentIcon(sentiment)}
                      <span className="ml-1 capitalize">{sentiment}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(count / metrics.totalConversations) * 100} 
                      className="w-20" 
                    />
                    <span className="text-sm text-gray-600 w-12">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Latest user interactions with the AI assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.recentConversations.map((conversation) => (
              <div key={conversation.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {conversation.intent.replace(/_/g, ' ')}
                    </Badge>
                    <Badge className={getSentimentColor(conversation.sentiment)}>
                      {getSentimentIcon(conversation.sentiment)}
                      <span className="ml-1">{conversation.sentiment}</span>
                    </Badge>
                    {conversation.satisfaction && (
                      <Badge variant="outline" className="text-yellow-600">
                        <Star className="w-3 h-3 mr-1" />
                        {conversation.satisfaction}/5
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(conversation.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">User:</span> {conversation.userMessage}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-sitenest-primary">AI:</span> {conversation.botResponse}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
