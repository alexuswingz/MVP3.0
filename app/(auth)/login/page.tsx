'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(formData.email, formData.password);
    router.push('/dashboard');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <div className="min-h-screen bg-background-primary flex">
      {/* Left Side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 
                   relative overflow-hidden flex-col justify-between p-12"
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply 
                        filter blur-3xl opacity-30 animate-pulse" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply 
                        filter blur-3xl opacity-25 animate-pulse" 
             style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] 
                        bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" 
             style={{ animationDuration: '5s', animationDelay: '0.5s' }} />

        <div className="relative z-10">
          {/* Logo & Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 mb-12"
          >
            <Image
              src="/logo.png"
              alt="1000 Bananas"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-white font-bold text-lg">1000 Bananas</span>
          </motion.div>

          {/* Heading */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
              Manage your products with peel.
            </h1>
            <p className="text-white/90 text-lg drop-shadow-md">
              Join thousands of product managers who are shipping faster and sweeter updates.
            </p>
          </motion.div>
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-2">
              {[
                { bg: 'from-blue-400 to-cyan-400', initial: 'S' },
                { bg: 'from-purple-400 to-pink-400', initial: 'J' },
                { bg: 'from-orange-400 to-yellow-400', initial: 'M' },
                { bg: 'from-green-400 to-emerald-400', initial: 'A' },
              ].map((avatar, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatar.bg} 
                           border-2 border-white shadow-lg flex items-center justify-center
                           text-white font-semibold text-sm`}
                >
                  {avatar.initial}
                </div>
              ))}
            </div>
            <span className="text-white font-medium text-sm">+2,000 teams worldwide</span>
          </div>
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-300 text-lg">★</span>
            ))}
          </div>
          <p className="text-white text-sm leading-relaxed mb-4">
            &ldquo;1000 Bananas has completely transformed how we track our MVP progress. The distinction between stable and experimental features is a game changer.&rdquo;
          </p>
          <p className="text-white font-semibold text-sm">Sarah Jenkins</p>
          <p className="text-white/80 text-xs mt-0.5">Product Lead at TechFlow</p>
        </motion.div>
      </motion.div>

      {/* Right Side - Login Form */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8"
      >
        <div className="w-full max-w-md">
          {/* Welcome Header */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground-primary mb-2">Welcome back!</h2>
            <p className="text-foreground-secondary">Please enter your details to sign in.</p>
          </motion.div>

          {/* Tab Selector */}
          <motion.div variants={itemVariants} className="flex gap-2 mb-8 bg-background-secondary rounded-lg p-1">
            <button className="flex-1 py-2 px-4 rounded-md bg-primary text-white text-sm font-medium 
                             transition-all flex items-center justify-center gap-2">
              <span className="text-lg">🔷</span>
              Core Platform
            </button>
            <button className="flex-1 py-2 px-4 rounded-md text-foreground-secondary text-sm font-medium 
                             hover:text-foreground-primary transition-all">
              MVP Sandbox
            </button>
          </motion.div>

          {/* Login Form */}
          <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-background-secondary border border-border
                           text-foreground-primary placeholder:text-foreground-muted
                           focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                           transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground-secondary">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary-light transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-11 pl-10 pr-12 rounded-lg bg-background-secondary border border-border
                           text-foreground-primary placeholder:text-foreground-muted
                           focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                           transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5
                           text-foreground-muted hover:text-foreground-secondary
                           transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-background-secondary cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-foreground-secondary cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover 
                       hover:to-orange-600 text-white font-medium rounded-lg transition-all"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </motion.form>

          {/* Divider */}
          <motion.div variants={itemVariants} className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background-primary text-foreground-muted">
                Or continue with
              </span>
            </div>
          </motion.div>

          {/* Social Login */}
          <motion.div variants={itemVariants} className="flex gap-3">
            <button
              type="button"
              className="flex-1 h-11 rounded-lg border border-border bg-background-secondary 
                       hover:bg-background-tertiary text-foreground-primary font-medium
                       transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">🔍</span>
              <span className="hidden sm:inline">Google</span>
            </button>
            <button
              type="button"
              className="flex-1 h-11 rounded-lg border border-border bg-background-secondary 
                       hover:bg-background-tertiary text-foreground-primary font-medium
                       transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">⚙️</span>
              <span className="hidden sm:inline">GitHub</span>
            </button>
          </motion.div>

          {/* Sign Up Link */}
          <motion.p variants={itemVariants} className="text-center text-sm text-foreground-secondary mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-primary hover:text-primary-light font-semibold transition-colors"
            >
              Sign up for free
            </Link>
          </motion.p>

          {/* Footer Links */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border text-xs text-foreground-muted"
          >
            <Link href="/privacy" className="hover:text-foreground-secondary transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-foreground-secondary transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/help" className="hover:text-foreground-secondary transition-colors">
              Help Center
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
