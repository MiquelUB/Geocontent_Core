'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !email.includes('@')) {
      setError(t('errorLogin')) // Or use a specific key like invalidEmail
      return
    }

    setIsLoading(true)
    
    setTimeout(() => {
      setIsLoading(false)
      setIsSuccess(true)
    }, 1500)
  }

  if (isSuccess) {
    return <SuccessScreen email={email} />
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      
      {/* Background Image - login_campesina.png */}
      <div className="absolute inset-0">
        <img 
          src="/login.jpg" 
          alt="Login"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Email Field Overlay */}
      <form onSubmit={handleSubmit} className="absolute inset-0">
        
        {/* Email Input - positioned exactly in the ornate frame */}
        <div style={{ 
          position: 'absolute',
          top: '65%',
          left: '62%',
          transform: 'translate(-50%, -50%)',
          width: '420px',
          zIndex: 10
        }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=""
            className="w-full px-4 py-2 outline-none transition-all"
            style={{
              backgroundColor: 'rgba(244, 232, 208, 0.3)',
              border: 'none',
              fontFamily: '"Playfair Display", serif',
              fontSize: '18px',
              color: '#3d2817',
              letterSpacing: '1px',
              textAlign: 'left',
              caretColor: '#3d2817'
            }}
          />
          {error && (
            <p className="mt-2 text-xs px-3 py-1" style={{ 
              color: '#8b2e2e', 
              backgroundColor: 'rgba(250, 248, 243, 0.95)', 
              display: 'inline-block', 
              borderRadius: '4px',
              fontFamily: '"Crimson Text", serif',
              border: '1px solid rgba(139, 46, 46, 0.3)'
            }}>
              {error}
            </p>
          )}
        </div>

        {/* Submit Button - positioned over the ENVIAR wax seal */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            position: 'absolute',
            top: '77%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 10
          }}
          aria-label={t('loginButton')}
        />

      </form>

    </div>
  )
}

// Success Screen
function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      
      {/* Background Image - login_succes.jpg (new background) */}
      <div className="absolute inset-0">
        <img 
          src="/login_succes.jpg" 
          alt="Success"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Email display overlay - positioned in the ornate frame's white space */}
      <div style={{ 
        position: 'absolute',
        top: '78%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '420px',
        zIndex: 10,
        textAlign: 'center'
      }}>
        <p 
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '18px',
            color: '#3d2817',
            letterSpacing: '0.5px',
            backgroundColor: 'transparent',
            padding: '8px 16px',
            display: 'inline-block'
          }}>
          {email}
        </p>
      </div>

    </div>
  )
}
