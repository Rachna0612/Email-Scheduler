import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config';
import { prisma } from '../lib/prisma';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value;
        const googleId = profile.id;

        if (!email) {
          return done(new Error('No email from Google'), undefined);
        }

        let user = await prisma.user.findFirst({
          where: { OR: [{ googleId }, { email }] },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: name || undefined,
              avatar: avatar || undefined,
              googleId,
            },
          });
        } else if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId, name: name || user.name, avatar: avatar || user.avatar },
          });
        }

        return done(null, {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        });
      } catch (err) {
        return done(err, undefined);
      }
    }
  )
);
