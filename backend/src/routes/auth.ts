import { Router, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

passport.serializeUser((user: unknown, done) => done(null, (user as { id: string }).id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${config.frontendUrl}/login?error=auth_failed` }),
  async (req: Request, res: Response) => {
    const user = req.user as { id: string; email: string; name: string | null; avatar: string | null };
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
  }
);

router.get('/me', authMiddleware, (req: Request, res) => {
  const u = req.user!;
  res.json({ id: u.id, email: u.email, name: u.name, avatar: u.avatar });
});

export default router;
