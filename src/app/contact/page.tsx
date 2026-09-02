'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, Send } from 'lucide-react'

export default function ContactPage() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    // Formspree / Database Handler
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData)

        try {
            // 1. Save to our Database
            const dbRes = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!dbRes.ok) throw new Error('Failed to save message')

            // 2. Forward to Formspree (Optional client-side redirect or handled by API)
            // For this implementation, we'll assume the API handles the notification or we rely on DB admin panel

            toast({
                title: "Message Sent!",
                description: "We have received your message and will get back to you soon.",
            })

                // Reset form
                (e.target as HTMLFormElement).reset()

        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container max-w-4xl mx-auto py-12 px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Contact Info */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
                        <p className="text-muted-foreground">
                            Have questions, news tips, or advertising inquiries? We'd love to hear from you.
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Mail className="h-4 w-4" /> Email
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div>
                                <span className="font-semibold block">Advertising Inquiries:</span>
                                <a href="mailto:contact@jurnal.kotabunan.com" className="text-blue-600 hover:underline">contact@jurnal.kotabunan.com</a>
                            </div>
                            <div>
                                <span className="font-semibold block">General Info & Tips:</span>
                                <a href="mailto:info@jurnal.kotabunan.com" className="text-blue-600 hover:underline">info@jurnal.kotabunan.com</a>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Contact Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Send a Message</CardTitle>
                        <CardDescription>
                            Fill out the form below and our team will respond shortly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" name="name" placeholder="Your Name" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" placeholder="your@email.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" name="subject" placeholder="What is this about?" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    name="message"
                                    placeholder="Your message here..."
                                    className="min-h-[150px]"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                Send Message
                            </Button>
                        </form>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
