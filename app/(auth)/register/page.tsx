'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await register(
      formData.email,
      formData.password,
      formData.passwordConfirm,
      formData.firstName,
      formData.lastName
    );
    if (success) {
      router.push('/dashboard');
    }
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
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply 
                        filter blur-3xl opacity-30 animate-pulse" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply 
                        filter blur-3xl opacity-25 animate-pulse" 
             style={{ animationDuration: '6s', animationDelay: '1s' }} />

        <div className="relative z-10">
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

          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
              Start managing your inventory today.
            </h1>
            <p className="text-white/90 text-lg drop-shadow-md">
              Join thousands of Amazon sellers who trust our platform for inventory forecasting.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-2xl"
        >
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-300 text-lg">★</span>
            ))}
          </div>
          <p className="text-white text-sm leading-relaxed mb-4">
            &ldquo;Setting up was incredibly fast. Within minutes we had our entire product catalog synced and forecasts running.&rdquo;
          </p>
          <p className="text-white font-semibold text-sm">Michael Chen</p>
          <p className="text-white/80 text-xs mt-0.5">Operations Manager at GrowthBrands</p>
        </motion.div>
      </motion.div>

      {/* Right Side - Register Form */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8"
      >
        <div className="w-full max-w-md">
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground-primary mb-2">Create your account</h2>
            <p className="text-foreground-secondary">Start your 14-day free trial. No credit card required.</p>
          </motion.div>

          <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  First name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-background-secondary border border-border
                             text-foreground-primary placeholder:text-foreground-muted
                             focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                             transition-all"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full h-11 px-4 rounded-lg bg-background-secondary border border-border
                           text-foreground-primary placeholder:text-foreground-muted
                           focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                           transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>

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
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Password
              </label>
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
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.passwordConfirm}
                  onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-background-secondary border border-border
                           text-foreground-primary placeholder:text-foreground-muted
                           focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                           transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover 
                       hover:to-orange-600 text-white font-medium rounded-lg transition-all"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>

            {/* Terms */}
            <p className="text-xs text-foreground-muted text-center">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </motion.form>

          {/* Sign In Link */}
          <motion.p variants={itemVariants} className="text-center text-sm text-foreground-secondary mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary hover:text-primary-light font-semibold transition-colors"
            >
              Sign in
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
