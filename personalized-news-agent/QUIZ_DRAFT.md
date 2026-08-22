# Reader Type Quiz — Draft v1

## Design Philosophy

Inspired by SBTI (Silly Big Type Indicator) — the viral Chinese personality test
that uses absurd, scenario-based questions to reveal real behavioral patterns.

**The vibe:** fun, slightly chaotic, feels like a TikTok quiz a friend sent you.
**NOT:** "On a scale of 1-5, how much do you prefer reading in-depth articles?"
**YES:** "You open a news app during breakfast. You've read exactly 1.5 stories when your coffee is done. You:"

Each question maps to 1–2 reader dimensions below the surface.
The user never sees the dimensions — they just answer fun questions.

**Target length:** 10 questions, ~2 minutes to complete.

---

## Reader Dimensions (Hidden from User)

Each question scores one or more of these:

- **D** = Depth (skim ↔ deep)
- **F** = Format (bullets ↔ prose)
- **Fr** = Framing (optimist ↔ skeptic)
- **K** = Knowledge assumption (explain everything ↔ assume I know stuff)
- **P** = Pace (fast ↔ slow/thorough)

---

## The Quiz Questions

---

### Q1 — The Cat Question
> 你在认真学习，但旁边突然出现了一只猫。你会：

- 🐱 立刻停下来撸猫，学习？什么学习？ → **skim / fast**
- 📚 把猫放腿上继续看，两不误 → **medium depth / multitask**
- 🚪 把猫请出房间，我在工作 → **deep / focused**
- 📸 先拍张照发朋友圈再说 → **connector / social**

*Dimensions: D, P*

---

### Q2 — The Meeting Question
> 你收到一个会议邀请，没有议程，只有标题："重要事项讨论"。你：

- 😤 点拒绝。这种会议是我的红线 → **skeptic / direct**
- 🕵️ 问一句"能不能先说一下是什么事" → **analyst / needs context**
- ✅ 接受，反正去了就知道了 → **scanner / goes with flow**
- 📝 接受，并提前准备了三种可能的话题 → **deep / planner**

*Dimensions: Fr, D*

---

### Q3 — The Group Chat Question
> 你打开一个100条未读消息的群聊。你的策略是：

- ⬆️ 直接滑到最新消息，看最后几条 → **scanner / skim**
- 🔍 从头看，不然会错过重要信息 → **deep / thorough**
- 📌 找有没有人@我，其他不看 → **fast / efficiency-first**
- 💬 发一条"有啥要紧的吗" → **connector / social outsourcer**

*Dimensions: D, P*

---

### Q4 — The Netflix Question
> Netflix 给你推荐了一部你完全没听过的剧，简介就两行字。你：

- ▶️ 直接开始看，不看评分也不看评论 → **optimist / fast**
- ⭐ 先看豆瓣评分 → **skeptic / validates before investing**
- 📖 把简介全部读完，点开"更多信息" → **deep / researcher**
- 📱 问朋友"这部好看吗" → **connector / social proof**

*Dimensions: Fr, K*

---

### Q5 — The Explanation Question
> 有人跟你解释了一个你不太懂的概念。你什么时候会说"我懂了"？

- 💡 听到第一个例子就懂了，不用再说 → **fast / intuitive**
- 🔄 要听两三个不同角度才算真的懂 → **deep / multi-perspective**
- ❓ 懂了但会再问一个"那如果……呢" → **analyst / edge case thinker**
- 😅 说了"懂了"其实回去还要自己再查一遍 → **self-directed learner**

*Dimensions: D, K*

---

### Q6 — The Bad News Question
> 你的朋友要跟你说一件坏消息。你希望他怎么说？

- 🩹 直接说，不用铺垫，我能接受 → **direct / skeptic**
- 🌈 先说点好的，再过渡到坏的 → **optimist / gradual**
- 📊 给我原因和背景，我要理解为什么 → **analyst / context-first**
- 🤝 管他怎么说，说完我们一起想解决方案 → **action-oriented**

*Dimensions: Fr, F*

---

### Q7 — The Article Length Question
> 你点开一篇文章，看到"预计阅读时间：15分钟"。你的第一反应是：

- 🏃 关掉，我只有3分钟 → **scanner / skim**
- 🔖 收藏，等我有时间再看 → **medium / procrastinator**
- ☕ 好，正好去冲杯咖啡再回来认真看 → **deep / commits**
- ⏩ 点开，但直接拖到结论部分 → **fast / conclusion-first**

*Dimensions: D, P*

---

### Q8 — The Finance News Question
> 你看到一条新闻："美联储可能加息"。你的反应是：

- 😱 加息？这对我有影响吗？ → **beginner / needs explanation**
- 📈 马上想到自己的投资组合 → **expert / personal stakes**
- 🤔 这是为什么？通胀？就业数据？ → **analyst / wants causality**
- 🤷 又来了，上次说降息现在又说加息 → **skeptic / cynical**

*Dimensions: K, Fr*

---

### Q9 — The Commute Question
> 你在通勤路上有20分钟。你会用来：

- 🎧 听播客或有声书 → **audio / listener**
- 📱 刷短视频或朋友圈 → **visual / casual**
- 📰 读文章或新闻 → **text / focused reader**
- 😴 放空或闭眼休息 → **low stimulation / recharger**

*Dimensions: F (format preference for audio feature)*

---

### Q10 — The "You" Question
> 最后一题。你觉得你是哪种人？（诚实回答，我们不评判）

- 🔥 我很快，我扫一眼就知道重不重要
- 🧩 我喜欢把所有碎片拼在一起，理解全局
- 📖 我慢慢读，我要真正理解
- 🎭 我喜欢有故事感的内容，数据和图表让我打瞌睡

*Dimensions: D, F (self-report override — highest weight)*

---

## Reader Type Scoring

After 10 questions, tally scores across dimensions and map to Reader Type:

| Reader Type | Description | Key Dimensions |
|------------|-------------|----------------|
| **⚡ The Flash** | 扫描型 — 给我最重要的一句话，其他都是噪音 | High P, Low D, Low K |
| **🔬 The Analyst** | 分析型 — 我要因果链、数据、背后的逻辑 | High D, High K, Medium Fr |
| **📖 The Storyteller** | 叙事型 — 用故事讲给我听，不要bullet points | Medium D, High F(prose), Low K |
| **🕵️ The Skeptic** | 怀疑型 — 先告诉我这里面哪里可能有问题 | High Fr(skeptic), High D |
| **🌱 The Explorer** | 探索型 — 我对这个不太懂，帮我从头讲 | Low K, Medium D, Low P |
| **🎧 The Listener** | 收听型 — 我不读，我听，通勤党首选 | High audio preference |

---

## After the Quiz — Result Screen

Each Reader Type gets:
- A fun name + emoji
- A 2-line description (written in that type's style, meta-demonstrating the product)
- "Your news will be formatted like this:" → mini preview of a story in their format
- "This doesn't feel right?" → quick adjustment options

---

## Notes for Refinement

- Q1 (猫) is the hook — should be first, sets the fun tone immediately
- Q8 (finance) is the knowledge calibration — feels natural within the flow
- Q9 (commute) directly feeds the audio feature decision
- Q10 is a self-report override — if user says "I'm a scanner" it overrides calculated type
- Consider adding 2 images/emoji per answer choice for visual appeal
- On mobile, consider swipe-style answer input (Tinder-style) vs. tap
