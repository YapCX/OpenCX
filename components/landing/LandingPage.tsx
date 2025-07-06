"use client";

import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Shield,
  TrendingUp,
  Users,
  CreditCard,
  Building,
  CheckCircle,
  Globe,
  Lock,
  BarChart3,
  DollarSign,
  ArrowRight,
  Mail,
  Phone,
  MapPin
} from "lucide-react";

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  message: string;
}

export function LandingPage() {
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      setSubmitMessage("Thank you for your interest! We'll contact you within 24 hours.");
      setContactForm({ name: "", email: "", company: "", message: "" });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">OpenCX</h1>
          </div>
          <div className="flex items-center space-x-4">
            <SignInButton mode="modal">
              <Button variant="outline">Sign In</Button>
            </SignInButton>
            <Button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
              Request Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Professional Currency Exchange Management Platform
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Streamline your currency exchange operations with real-time rates, complete compliance suite,
              and enterprise-grade security. Built for modern exchange businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                Request Demo <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Run Your Exchange</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From real-time rates to compliance management, OpenCX provides all the tools you need
              to operate a successful currency exchange business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-Time Exchange Rates</CardTitle>
                <CardDescription>
                  Live market rates with customizable markup and discount settings.
                  Manual rate overrides when needed.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Complete Compliance Suite</CardTitle>
                <CardDescription>
                  Built-in AML/KYC screening, sanctions checking, and risk assessment tools.
                  Stay compliant with regulations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>
                  Comprehensive customer profiles, document management, and risk scoring.
                  Support for both individual and corporate clients.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CreditCard className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Transaction Processing</CardTitle>
                <CardDescription>
                  Streamlined buy/sell order processing with automatic fee calculation
                  and payment tracking.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Building className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Multi-Location Support</CardTitle>
                <CardDescription>
                  Manage multiple tills and locations with centralized cash management
                  and user access control.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Advanced Reporting</CardTitle>
                <CardDescription>
                  Comprehensive analytics and reporting for compliance,
                  financial reconciliation, and business insights.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Choose OpenCX?</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Enterprise-Grade Security</h3>
                    <p className="text-muted-foreground">
                      Bank-level security with encrypted data storage, secure authentication,
                      and comprehensive audit trails.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Regulatory Compliance</h3>
                    <p className="text-muted-foreground">
                      Built-in compliance tools that help you meet AML, KYC, and other
                      regulatory requirements automatically.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Scalable Architecture</h3>
                    <p className="text-muted-foreground">
                      Grows with your business from single location to multi-branch operations
                      without compromising performance.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Expert Support</h3>
                    <p className="text-muted-foreground">
                      Dedicated support team with currency exchange industry expertise
                      to help you succeed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">50+</h3>
                  <p className="text-sm text-muted-foreground">Supported Currencies</p>
                </div>
                <div className="text-center">
                  <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">99.9%</h3>
                  <p className="text-sm text-muted-foreground">Uptime Guarantee</p>
                </div>
                <div className="text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">24/7</h3>
                  <p className="text-sm text-muted-foreground">Support Available</p>
                </div>
                <div className="text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Bank-Level</h3>
                  <p className="text-sm text-muted-foreground">Security Standards</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Started in 3 Simple Steps</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our streamlined onboarding process gets you up and running quickly with full support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Schedule Demo</h3>
              <p className="text-muted-foreground">
                Contact us to schedule a personalized demo and discuss your specific requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Setup & Configuration</h3>
              <p className="text-muted-foreground">
                Our team helps you configure the system, import your data, and train your staff.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Go Live</h3>
              <p className="text-muted-foreground">
                Launch your new system with confidence, backed by our ongoing support and training.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Exchange?</h2>
              <p className="text-lg text-muted-foreground">
                Schedule a demo today and see how OpenCX can streamline your currency exchange operations.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div>
                <h3 className="text-2xl font-semibold mb-6">Get in Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-primary" />
                    <span>contact@opencx.com</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Phone className="h-5 w-5 text-primary" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>Available Worldwide</span>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="font-semibold mb-4">Why Request a Demo?</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>See the platform in action with your use cases</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Discuss pricing and implementation timeline</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Get answers to your specific questions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Learn about integrations and customizations</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Request a Demo</CardTitle>
                  <CardDescription>
                    Fill out the form below and we&apos;ll get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitMessage ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <p className="text-green-600 font-semibold">{submitMessage}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          value={contactForm.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="company">Company Name *</Label>
                        <Input
                          id="company"
                          type="text"
                          value={contactForm.company}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={contactForm.message}
                          onChange={(e) => handleInputChange('message', e.target.value)}
                          placeholder="Tell us about your requirements..."
                          rows={4}
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Request Demo"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-muted/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <DollarSign className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">OpenCX</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 OpenCX. Professional currency exchange management platform.
          </p>
        </div>
      </footer>
    </div>
  );
}