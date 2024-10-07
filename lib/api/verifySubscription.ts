import { prisma } from "./db";
import { Subscription, User } from "@prisma/client";
import checkSubscriptionByEmail from "./checkSubscriptionByEmail";

interface UserIncludingSubscription extends User {
  subscriptions: Subscription | null;
}

export default async function verifySubscription(
  user?: UserIncludingSubscription
) {
  if (!user || !user.subscriptions) {
    return null;
  }

  if (
    !user.subscriptions.active ||
    new Date() > user.subscriptions.currentPeriodEnd
  ) {
    const subscription = await checkSubscriptionByEmail(user.email as string);

    if (
      !subscription ||
      !subscription.stripeSubscriptionId ||
      !subscription.currentPeriodEnd ||
      !subscription.currentPeriodStart ||
      !subscription.quantity
    ) {
      return null;
    }

    const {
      active,
      stripeSubscriptionId,
      currentPeriodStart,
      currentPeriodEnd,
      quantity,
    } = subscription;

    await prisma.subscription
      .upsert({
        where: {
          userId: user.id,
        },
        create: {
          active,
          stripeSubscriptionId,
          currentPeriodStart: new Date(currentPeriodStart),
          currentPeriodEnd: new Date(currentPeriodEnd),
          quantity,
          userId: user.id,
        },
        update: {
          active,
          stripeSubscriptionId,
          currentPeriodStart: new Date(currentPeriodStart),
          currentPeriodEnd: new Date(currentPeriodEnd),
          quantity,
        },
      })
      .catch((err) => console.log(err));
  }

  return user;
}
