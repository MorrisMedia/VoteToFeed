import prisma from "@/lib/prisma";

export const COMMENT_TEMPLATES = [
  "What a beautiful {breed}! 😍 Welcome to VoteToFeed!",
  "Oh my goodness, {petname} is ADORABLE! 🐾",
  "Welcome {petname}! You're going to love it here! 💕",
  "That face! {petname} is such a cutie! 🥰",
  "Is {petname} always this photogenic? What a star! ⭐",
  "I can't get over how cute {petname} is! Welcome! 🎉",
  "A {breed}! One of my favorite breeds! Welcome {petname}! 🐕",
  "Those eyes! {petname} has stolen my heart! 💖",
  "{petname} looks absolutely adorable! Welcome! 🎀",
  "So happy to see another {breed} here! Welcome {petname}! 🌟",
  "That {breed} smile is everything! Hi {petname}! 👋",
  "Welcome to the family, {petname}! You're gonna get so many votes! 🗳️",
  "{petname} is absolutely precious! What a sweet {breed}! 💝",
  "OMG look at that face! Welcome {petname}! You're a natural! 📸",
  "Hey {petname}! Ready to help feed some shelter pets? 🍖",
  "What a gorgeous {breed}! {petname} is a superstar! 🌈",
  "I'm voting for {petname} every single day! So cute! 🐶",
  "That {breed} energy is real! Welcome {petname}! 💫",
  "New best friend alert! Welcome {petname}! 🚨❤️",
  "Okay {petname} just won the cutest pet contest IMO! 🏆",
  "A {breed} named {petname}? Perfect combo! Welcome! 🎊",
  "{petname} is giving major model vibes! 📷✨",
  "Can we talk about how precious {petname} is?! 😭💕",
  "Welcome welcome welcome {petname}! This {breed} is stunning! 🤩",
  "I need to meet {petname} in real life! What a sweetheart! 🥹",
  "That little face! {petname} you are TOO cute! 🧡",
  "Another gorgeous {breed} joins the party! Welcome {petname}! 🎈",
  "Aww {petname}! I bet you give the best cuddles! 🤗",
  "VoteToFeed just got cuter thanks to {petname}! Welcome! 🌸",
  "Hands down one of the cutest {breed}s I've ever seen! Hi {petname}! 🫶",
  "That tail must be wagging non-stop! Welcome {petname}! 🐕🦺",
  "So glad {petname} is here! What a beautiful pet! 🌻",
  "I'll be cheering for {petname} every week! Go {breed}s! 📣",
  "{petname} has main character energy and I'm here for it! 🎬",
  "Somebody get {petname} a modeling contract! Gorgeous {breed}! 😎",
  "The cutest {breed} in town! Welcome to VoteToFeed, {petname}! 🏠",
  "I showed {petname}'s photo to my pets and now they want to be friends! 🐾🐾",
  "Look at those paws! {petname} you are perfection! ✨",
  "{petname} and that {breed} charm — instant vote from me! 🗳️💖",
  "Just when I thought this app couldn't get cuter... {petname} showed up! 😍",
  "Welcome aboard, {petname}! Every vote helps feed a shelter pet! 🍖💕",
  "That {breed} face is making my day! Go {petname}! 🌞",
  "Cannot. Handle. The cuteness. Welcome {petname}! 💀❤️",
  "A+ entry right here! {petname} the {breed} is a winner! 🏅",
  "This might be the cutest {breed} photo ever! Welcome {petname}! 📸🐶",
  "I'm obsessed with {petname}! Such a beautiful {breed}! 😭💖",
  "New here? Welcome {petname}! You're already getting my vote! 👍",
  "That smile tho! {petname} you just made everyone's day! 😊",
  "Can {petname} teach my pets how to pose? A natural! 📷🌟",
  "Bring on the votes for {petname}! This {breed} deserves them all! 🗳️🎉",
];

export const GENERIC_COMMENT_TEMPLATES = [
  "Oh my goodness, {petname} is ADORABLE! 🐾",
  "Welcome {petname}! You're going to love it here! 💕",
  "That face! {petname} is such a cutie! 🥰",
  "Is {petname} always this photogenic? What a star! ⭐",
  "I can't get over how cute {petname} is! Welcome! 🎉",
  "Those eyes! {petname} has stolen my heart! 💖",
  "{petname} looks absolutely adorable! Welcome! 🎀",
  "Welcome to the family, {petname}! You're gonna get so many votes! 🗳️",
  "OMG look at that face! Welcome {petname}! You're a natural! 📸",
  "Hey {petname}! Ready to help feed some shelter pets? 🍖",
  "New best friend alert! Welcome {petname}! 🚨❤️",
  "Okay {petname} just won the cutest pet contest IMO! 🏆",
  "{petname} is giving major model vibes! 📷✨",
  "Can we talk about how precious {petname} is?! 😭💕",
  "I need to meet {petname} in real life! What a sweetheart! 🥹",
  "That little face! {petname} you are TOO cute! 🧡",
  "Aww {petname}! I bet you give the best cuddles! 🤗",
  "VoteToFeed just got cuter thanks to {petname}! Welcome! 🌸",
  "So glad {petname} is here! What a beautiful pet! 🌻",
  "{petname} has main character energy and I'm here for it! 🎬",
  "I showed {petname}'s photo to my pets and now they want to be friends! 🐾🐾",
  "Look at those paws! {petname} you are perfection! ✨",
  "Just when I thought this app couldn't get cuter... {petname} showed up! 😍",
  "Welcome aboard, {petname}! Every vote helps feed a shelter pet! 🍖💕",
  "Cannot. Handle. The cuteness. Welcome {petname}! 💀❤️",
  "New here? Welcome {petname}! You're already getting my vote! 👍",
  "That smile tho! {petname} you just made everyone's day! 😊",
  "Can {petname} teach my pets how to pose? A natural! 📷🌟",
];

const DEFAULT_SCHEDULED_COMMENT_COUNT = 5;
const ENGAGEMENT_EMAIL_DOMAIN = "@iheartdogs.com";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function renderTemplate(template: string, vars: { petname: string; breed: string }) {
  return template.replace(/\{petname\}/g, vars.petname).replace(/\{breed\}/g, vars.breed);
}

export function normalizeBreedLabel(breed: string | null | undefined) {
  const cleaned = breed?.trim();
  if (!cleaned) return null;

  const normalized = cleaned.toLowerCase();
  if (
    normalized === "unknown" ||
    normalized === "other" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "none" ||
    normalized === "pet"
  ) {
    return null;
  }

  return cleaned;
}

function pickUniqueCommentTexts(petName: string, breed: string | null | undefined, count: number) {
  const normalizedBreed = normalizeBreedLabel(breed);
  const templatePool = normalizedBreed ? COMMENT_TEMPLATES : GENERIC_COMMENT_TEMPLATES;

  return shuffle(templatePool)
    .slice(0, count)
    .map((template) => renderTemplate(template, { petname: petName, breed: normalizedBreed || "" }));
}

function buildScheduleTimes(startAt: Date, count: number) {
  const dayMs = 24 * 60 * 60 * 1000;
  const windowMs = dayMs / count;

  return Array.from({ length: count }, (_, index) => {
    const windowStart = index * windowMs;
    const randomOffset = Math.floor(Math.random() * windowMs);
    return new Date(startAt.getTime() + windowStart + randomOffset);
  }).sort((a, b) => a.getTime() - b.getTime());
}

export async function schedulePetWelcomeComments(params: {
  petId: string;
  petName: string;
  petBreed: string | null;
  targetUserId: string;
  count?: number;
}) {
  const count = params.count ?? DEFAULT_SCHEDULED_COMMENT_COUNT;
  if (count <= 0) return { scheduledCount: 0, skipped: "count_zero" };

  const engagementAccounts = await prisma.user.findMany({
    where: {
      role: "USER",
      email: { contains: ENGAGEMENT_EMAIL_DOMAIN },
      id: { not: params.targetUserId },
    },
    select: { id: true },
  });

  if (engagementAccounts.length === 0) {
    return { scheduledCount: 0, skipped: "no_engagement_accounts" };
  }

  const selectedAccounts = shuffle(engagementAccounts).slice(0, Math.min(count, engagementAccounts.length));
  const scheduleTimes = buildScheduleTimes(new Date(), selectedAccounts.length);
  const commentTexts = pickUniqueCommentTexts(params.petName, params.petBreed, selectedAccounts.length);

  await prisma.scheduledComment.createMany({
    data: selectedAccounts.map((account, index) => ({
      petId: params.petId,
      engagementAccountId: account.id,
      scheduledFor: scheduleTimes[index],
      commentText: commentTexts[index],
      status: "PENDING",
    })),
  });

  return { scheduledCount: selectedAccounts.length, skipped: null };
}

export async function processScheduledComments() {
  const dueComments = await prisma.scheduledComment.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: new Date() },
    },
    orderBy: { scheduledFor: "asc" },
    include: {
      pet: { select: { userId: true } },
      engagementAccount: { select: { id: true } },
    },
  });

  let processedCount = 0;
  let failedCount = 0;

  for (const scheduledComment of dueComments) {
    try {
      const claimed = await prisma.scheduledComment.updateMany({
        where: { id: scheduledComment.id, status: "PENDING" },
        data: { status: "PROCESSING" },
      });

      if (claimed.count === 0) continue;

      await prisma.$transaction(async (tx) => {
        await tx.comment.create({
          data: {
            petId: scheduledComment.petId,
            userId: scheduledComment.engagementAccountId,
            text: scheduledComment.commentText,
          },
        });

        await tx.engagementLog.create({
          data: {
            targetUserId: scheduledComment.pet.userId,
            seedAccountId: scheduledComment.engagementAccount.id,
            petId: scheduledComment.petId,
            action: "comment",
            commentText: scheduledComment.commentText,
          },
        });

        await tx.scheduledComment.update({
          where: { id: scheduledComment.id },
          data: {
            status: "PROCESSED",
            processedAt: new Date(),
            errorMessage: null,
          },
        });
      });

      processedCount += 1;
    } catch (error) {
      failedCount += 1;
      await prisma.scheduledComment.update({
        where: { id: scheduledComment.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
        },
      }).catch(() => {});
    }
  }

  return {
    dueCount: dueComments.length,
    processedCount,
    failedCount,
  };
}
