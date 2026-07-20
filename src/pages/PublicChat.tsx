import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Send, MessageCircle, Users, Trash2, Smile, Image, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import SEO from "@/components/SEO";
import RideBadge from "@/components/RideBadge";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface ChatMessage {
  id: string;
  message: string;
  image_url: string | null;
  created_at: string;
  profile_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    badge: string | null;
    total_rides: number | null;
  };
}

const PublicChat = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const onlineCount = useOnlineUsers();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('public-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'public_chat_messages'
        },
        async (payload) => {
          const { data } = await supabase
            .from('public_chat_messages')
            .select(`
              id,
              message,
              image_url,
              created_at,
              profile_id,
              profiles:profile_id (
                id,
                full_name,
                avatar_url,
                badge,
                total_rides
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data as unknown as ChatMessage]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'public_chat_messages'
        },
        (payload) => {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('public_chat_messages')
        .select(`
          id,
          message,
          image_url,
          created_at,
          profile_id,
          profiles:profile_id (
            id,
            full_name,
            avatar_url,
            badge,
            total_rides
          )
        `)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data as unknown as ChatMessage[]) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error("Nepodarilo sa načítať správy");
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Vyber prosím obrázok");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Obrázok je príliš veľký (max 5MB)");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || !profile?.id) return null;

    const fileExt = selectedImage.name.split('.').pop();
    const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, selectedImage);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const addEmoji = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
    setEmojiOpen(false);
    inputRef.current?.focus();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !profile?.id || sending) return;

    setSending(true);
    setUploading(!!selectedImage);

    try {
      let imageUrl: string | null = null;

      if (selectedImage) {
        imageUrl = await uploadImage();
      }

      const { error } = await supabase
        .from('public_chat_messages')
        .insert({
          profile_id: profile.id,
          message: newMessage.trim(),
          image_url: imageUrl
        });

      if (error) throw error;
      
      setNewMessage("");
      clearSelectedImage();
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Nepodarilo sa odoslať správu");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('public_chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error("Nepodarilo sa vymazať správu");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'HH:mm');
    }
    return format(date, 'd. MMM HH:mm', { locale: sk });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <SEO title="Chat komunity" description="Verejný chat komunity TakeMe — diskutuj s ostatnými vodičmi a pasažiermi." path="/chat" noindex />
      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zavrieť zväčšený obrázok"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={fullscreenImage}
              alt="Obrázok v plnej veľkosti z chatu"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3"
      >
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Späť na predchádzajúcu stránku"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Verejný chat</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                {onlineCount} online
              </p>
            </div>
          </div>
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        ) : messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center py-12"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Žiadne správy</h3>
            <p className="text-sm text-muted-foreground">Buď prvý, kto napíše!</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isOwn = msg.profile_id === profile?.id;
              const showAvatar = index === 0 || messages[index - 1]?.profile_id !== msg.profile_id;
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {showAvatar ? (
                    <Avatar className="w-8 h-8 shrink-0 ring-2 ring-background shadow-md">
                      <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                        {getInitials(msg.profiles?.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  
                  <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {showAvatar && !isOwn && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {msg.profiles?.full_name}
                        </span>
                        <RideBadge totalRides={msg.profiles?.total_rides} size="xs" />
                        {msg.profiles?.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium">
                            {msg.profiles.badge}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="group relative">
                      <Card 
                        className={`px-3 py-2 shadow-sm border-0 overflow-hidden ${
                          isOwn 
                            ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-md' 
                            : 'bg-card/80 backdrop-blur-sm text-card-foreground rounded-2xl rounded-tl-md'
                        }`}
                      >
                        {msg.image_url && (
                          <motion.img
                            src={msg.image_url}
                            alt="Obrázok zdieľaný v chate"
                            className="max-w-full max-h-60 rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setFullscreenImage(msg.image_url)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          />
                        )}
                        {msg.message && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        )}
                      </Card>
                      {isOwn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Vymazať správu"
                          onClick={() => deleteMessage(msg.id)}
                          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <span className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                      {formatMessageTime(msg.created_at)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-background/80 backdrop-blur-xl border-t border-border/50 px-4 py-2"
          >
            <div className="max-w-3xl mx-auto relative inline-block">
              <img 
                src={imagePreview} 
                alt="Náhľad vybraného obrázka pred odoslaním" 
                className="h-20 rounded-lg object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                aria-label="Odstrániť vybraný obrázok"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={clearSelectedImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 px-4 py-3 pb-safe"
      >
        <form onSubmit={sendMessage} className="flex gap-2 max-w-3xl mx-auto items-center">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Image upload button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Pridať obrázok do správy"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="shrink-0 text-muted-foreground hover:text-primary"
          >
            <Image className="h-5 w-5" />
          </Button>

          {/* Emoji picker */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Otvoriť výber emoji"
                disabled={sending}
                className="shrink-0 text-muted-foreground hover:text-primary"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 border-0" 
              side="top" 
              align="start"
            >
              <Picker 
                data={data} 
                onEmojiSelect={addEmoji} 
                theme="auto"
                locale="sk"
                previewPosition="none"
                skinTonePosition="none"
              />
            </PopoverContent>
          </Popover>

          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Napíš správu..."
            className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-full px-4 text-foreground placeholder:text-muted-foreground"
            disabled={sending}
          />

          <Button 
            type="submit" 
            size="icon"
            aria-label="Odoslať správu"
            disabled={(!newMessage.trim() && !selectedImage) || sending}
            className="rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default PublicChat;
