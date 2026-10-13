import React from 'react';
import CardGlare from './CardGlare';
import { Sparkles, ExternalLink } from 'lucide-react';

export function InstagramIcon({ className = 'w-5 h-5', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function FacebookIcon({ className = 'w-5 h-5', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// Configurable social handles for Jit & Saini
export const SOCIAL_ACCOUNTS = [
  {
    id: 'instagram',
    platform: 'Instagram',
    subtitle: 'Moments, reels & visual stories',
    theme: 'instagram',
    shineColor: ['#e1306c', '#fd1d1d', '#f77737', '#833ab4', '#ffffff'],
    iconBg: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
    Icon: InstagramIcon,
    accentBtn: 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600',
    platformUrl: 'https://www.instagram.com',
    profiles: [
      {
        id: 'saini-ig',
        name: 'Saini Paul',
        handle: '@sainipaul7_official',
        url: 'https://www.instagram.com/sainipaul7_official/',
        avatarUrl: '/api/get-social-avatar?platform=instagram&handle=sainipaul7_official',
      },
      {
        id: 'jit-ig',
        name: 'Jit Hazra',
        handle: '@ig__jit',
        url: 'https://www.instagram.com/ig__jit',
        avatarUrl: '/api/get-social-avatar?platform=instagram&handle=ig__jit',
      },
    ],
  },
  {
    id: 'facebook',
    platform: 'Facebook',
    subtitle: 'Milestones & shared memories',
    theme: 'facebook',
    shineColor: ['#1877f2', '#2563eb', '#60a5fa', '#93c5fd', '#ffffff'],
    iconBg: 'bg-gradient-to-tr from-[#1877f2] via-[#2563eb] to-[#3b82f6]',
    Icon: FacebookIcon,
    accentBtn: 'bg-gradient-to-r from-blue-600 to-indigo-600',
    platformUrl: 'https://www.facebook.com',
    profiles: [
      {
        id: 'saini-fb',
        name: 'Saini Paul',
        handle: 'Saini Paul',
        url: 'https://www.facebook.com/saini.paul.79',
        avatarUrl: '/api/get-social-avatar?platform=facebook&id=saini.paul.79',
      },
      {
        id: 'jit-fb',
        name: 'Jit Hazra',
        handle: 'Jit Hazra',
        url: 'https://www.facebook.com/jit.hazra.704131',
        avatarUrl: '/api/get-social-avatar?platform=facebook&id=jit.hazra.704131',
      },
    ],
  },
];

export default function SocialCard({ className = '' }) {
  return (
    <section className={`space-y-6 max-w-4xl mx-auto ${className}`}>
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Orbit Connections</span>
        </div>
        <h2
          className="text-2xl sm:text-3xl font-bold text-gray-900 font-berkshire tracking-wide"
          style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
        >
          Our Social Constellation
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 font-medium max-w-lg mx-auto">
          Stay close to our journey across the cosmos. Connect with Jit & Saini on Instagram and Facebook!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        {SOCIAL_ACCOUNTS.map((account) => {
          const IconComponent = account.Icon;

          return (
            <CardGlare
              key={account.id}
              borderWidth={2.5}
              duration={8}
              shineColor={account.shineColor}
              className="w-full rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300"
              innerClassName="relative bg-white/95 backdrop-blur-xl rounded-[22px] p-6 sm:p-7 overflow-hidden text-left space-y-5 border border-rose-100/80 flex flex-col justify-between h-full"
            >
              <div className="space-y-5">
                {/* Top Bar: Icon & Badge */}
                <div className="flex items-center justify-between gap-3 border-b border-rose-100/70 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl ${account.iconBg} text-white flex items-center justify-center shadow-md shrink-0`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3
                        className="text-xl sm:text-2xl font-bold text-rose-950 font-berkshire tracking-wide"
                        style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                      >
                        {account.platform}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-rose-600/90 font-medium">
                        {account.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile Cards */}
                <div className="space-y-2.5">
                  {account.profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="p-3 sm:p-3.5 rounded-2xl bg-rose-50/50 hover:bg-rose-50/90 border border-rose-100/90 transition-all flex items-center justify-between gap-2.5 group/item"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="relative w-10 h-10 shrink-0">
                          <img
                            src={profile.avatarUrl}
                            alt={profile.name}
                            loading="lazy"
                            className="w-10 h-10 rounded-xl object-cover ring-2 ring-rose-200/80 shadow-xs transition-transform duration-200 group-hover/item:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div
                            style={{ display: 'none' }}
                            className={`w-10 h-10 rounded-xl items-center justify-center font-bold text-xs sm:text-sm text-white shadow-xs ${
                              account.id === 'instagram'
                                ? 'bg-gradient-to-br from-rose-500 to-pink-500'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                            }`}
                          >
                            {profile.name.charAt(0)}
                          </div>
                          <span
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white ring-2 ring-white shadow-xs ${
                              account.id === 'instagram'
                                ? 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]'
                                : 'bg-[#1877f2]'
                            }`}
                            title={account.platform}
                          >
                            <IconComponent className="w-2.5 h-2.5" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                              {profile.name}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-semibold text-gray-600 block truncate">
                            {profile.handle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={profile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200/70 text-gray-700 hover:text-rose-700 text-xs font-semibold transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          title={`Open ${profile.name}'s profile`}
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-[11px] text-gray-600 font-medium hidden sm:inline">
                            Visit
                          </span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardGlare>
          );
        })}
      </div>
    </section>
  );
}
