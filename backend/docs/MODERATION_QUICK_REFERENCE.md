# Moderation Quick Reference Guide

## 🚨 Harmful Keywords by Category

### Violence & Harm
```
violence, attack, fight, kill, murder, assault, weapon, bomb, 
threat, danger, harm, hurt, destroy, damage, crash, burn
```

### Self-Harm & Mental Health
```
suicide, self-harm, self-injury, end-it-all, kill-myself, 
depression, hopeless, worthless, no-reason-to-live, 
cutting, overdose, hanging, shooting
```

### Harassment & Bullying
```
hate, harassment, bullying, intimidation, stalk, threaten, 
abuse, insult, mock, ridicule, humiliate, embarrass, 
discriminate, racist, sexist, homophobic
```

### Illegal Activities
```
drugs, illegal, scam, fraud, theft, steal, cheat, hack, 
pirate, counterfeit, bribe, corruption, money-laundering
```

### Inappropriate Content
```
inappropriate, offensive, spam, nude, porn, sexual, 
explicit, vulgar, profanity, curse, swear, insult
```

### Misinformation & Fake News
```
fake, hoax, conspiracy, lies, false, untrue, misleading, 
deceptive, propaganda, disinformation, clickbait
```

### Financial Scams
```
investment, crypto, bitcoin, money-making, get-rich-quick, 
lottery, inheritance, prince, urgent, limited-time, 
free-money, work-from-home, easy-money
```

## 📊 Severity Assessment Matrix

| Keyword Count | Severity | Action | Duration |
|---------------|----------|--------|----------|
| 0 | NONE | Allow | - |
| 1 | LOW | WARN | - |
| 2 | MEDIUM | MUTE | 15-60 min |
| 3+ | HIGH | LISTENER_RESPONSE | - |
| **SCAM** | HIGH | BAN | Permanent |

## ⚡ Quick Actions

### Immediate Ban (Scam/Illicit Marketing)
- Scam keywords detected
- Fraudulent content
- Illegal marketing
- Financial deception
- Counterfeit products

### Listener Response (High Severity)
- Multiple harmful keywords
- Self-harm indicators
- Violence threats
- Mental health concerns
- Coordinated harassment

### Temporary Mute (Medium Severity)
- Hostile language
- Spam behavior
- Minor harassment
- Inappropriate content

### Warning (Low Severity)
- Single harmful keyword
- Questionable content
- Borderline behavior
- First-time violations

## 🔧 Configuration Examples

### Basic Moderation Setup
```typescript
const moderationConfig = {
  autoWarn: true,           // Send warnings automatically
  autoMute: true,           // Mute users automatically
  autoBan: true,            // Ban users automatically
  muteDuration: 30,         // 30 minutes default
  warningThreshold: 2,      // 2 warnings before mute
  sensitivityLevel: 'MEDIUM'
};
```

### Custom Keyword Lists
```typescript
// Add domain-specific harmful terms
const customKeywords = {
  gaming: ['hack', 'cheat', 'exploit', 'glitch'],
  education: ['plagiarism', 'cheat', 'copy', 'fake-degree'],
  health: ['miracle-cure', 'alternative-medicine', 'detox']
};
```

### Group-Specific Rules
```typescript
const groupRules = {
  'mental-health-support': {
    sensitivityLevel: 'HIGH',
    requireHumanReview: true,
    customKeywords: ['trigger', 'trauma', 'ptsd']
  },
  'business-networking': {
    sensitivityLevel: 'MEDIUM',
    autoBan: false,
    customKeywords: ['mlm', 'pyramid-scheme', 'multi-level']
  }
};
```

## 📝 Moderation Log Format

```typescript
interface ModerationLog {
  id: string;
  timestamp: Date;
  userId: string;
  groupId: string;
  content: string;
  flaggedTerms: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  action: 'WARN' | 'MUTE' | 'LISTENER_RESPONSE' | 'LOCK_GROUP';
  reason: string;
  moderatorId?: string;
  listenerId?: string;
  responseContent?: string;
  duration?: number;
  reviewed: boolean;
  appealStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
```

## 🚀 Performance Tips

### Optimize Filtering
```typescript
// Use Set for faster lookups
const harmfulKeywordsSet = new Set(harmfulKeywords);

// Batch process multiple messages
const results = await Promise.all(
  messages.map(msg => filterContent(msg.content, 'MESSAGE'))
);

// Cache common patterns
const patternCache = new Map();
```

### Monitor Performance
```typescript
// Track false positive rate
const falsePositiveRate = (falsePositives / totalFlagged) * 100;

// Monitor response time
const startTime = Date.now();
const result = await filterContent(content, type);
const responseTime = Date.now() - startTime;
```

## 🔍 Debugging Common Issues

### False Positives
```typescript
// Context-aware filtering
const context = {
  groupType: 'mental-health',
  userHistory: 'clean',
  messageLength: 'long',
  timeOfDay: 'night'
};

// Adjust sensitivity based on context
if (context.groupType === 'mental-health') {
  sensitivityLevel = 'LOW';
}
```

### Bypass Attempts
```typescript
// Detect obfuscation
const obfuscatedContent = content
  .replace(/[0-9]/g, '')           // Remove numbers
  .replace(/[^a-zA-Z]/g, ' ')      // Keep only letters
  .replace(/\s+/g, ' ')            // Normalize spaces
  .trim();
```

## 📞 Emergency Contacts

### Immediate Action Required
- **Self-Harm Threats**: Contact emergency services
- **Violence Threats**: Report to law enforcement
- **Child Safety**: Report to child protection services
- **Terrorism**: Report to national security agencies

### Support Resources
- **Crisis Hotline**: 988 (US)
- **Suicide Prevention**: 1-800-273-8255
- **Child Abuse**: 1-800-422-4453
- **Cyberbullying**: Report to platform moderators

---

*Remember: This system is designed to help, not replace human judgment. Always review flagged content and consider context before taking action.*
