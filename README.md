# 🌱 Green Project Crowdfund

A decentralized crowdfunding platform built on the Stacks blockchain for green and sustainable projects. Fund environmental initiatives with STX tokens and help build a sustainable future! 🌍

## ✨ Features

- 📝 **Create Projects**: Launch green project campaigns with goals and deadlines
- 💰 **Contribute**: Support projects with STX token contributions
- 🎯 **Goal-based Funding**: Projects must reach their funding goal to access funds
- 🔄 **Refund System**: Automatic refunds if projects don't meet their goals
- 📊 **Project Statistics**: Track funding progress, contributors, and completion rates
- ⏰ **Time-based Campaigns**: Projects have specific funding deadlines
- 🚫 **Project Management**: Creators can cancel or extend funding periods

## 🚀 Getting Started

### Prerequisites
- Clarinet CLI installed
- Node.js and npm
- Stacks wallet for testnet/mainnet deployment

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Green-Project-Crowdfund
```

2. Install dependencies:
```bash
npm install
```

3. Check contract compilation:
```bash
clarinet check
```

4. Run tests:
```bash
npm test
```

## 📋 Contract Functions

### 🔍 Read-Only Functions

| Function | Description |
|----------|-------------|
| `get-project` | Retrieve project details by ID |
| `get-contribution` | Get contribution details for a user |
| `is-project-funded` | Check if project reached its goal |
| `is-project-active` | Check if project is accepting contributions |
| `calculate-funding-percentage` | Get current funding percentage |
| `get-project-stats` | Comprehensive project statistics |

### ✍️ Public Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `create-project` | title, description, goal-amount, duration-blocks, category | Create a new green project |
| `contribute` | project-id, amount | Contribute STX to a project |
| `claim-funds` | project-id | Creator claims funds (goal must be met) |
| `refund` | project-id | Contributors get refunds (if goal not met) |
| `cancel-project` | project-id | Creator cancels active project |
| `extend-funding` | project-id, additional-blocks | Extend funding deadline |

## 💡 Usage Examples

### Creating a Project
```clarity
(contract-call? .Green-Project-Crowdfund create-project 
  "Solar Panel Installation"
  "Installing solar panels for community center to reduce carbon footprint"
  u1000000
  u144
  "renewable-energy"
)
```

### Contributing to a Project
```clarity
(contract-call? .Green-Project-Crowdfund contribute u1 u100000)
```

### Checking Project Status
```clarity
(contract-call? .Green-Project-Crowdfund get-project-stats u1)
```

## 📈 Project Categories

- 🌞 **renewable-energy**: Solar, wind, hydro projects
- 🌳 **reforestation**: Tree planting and forest restoration
- ♻️ **waste-management**: Recycling and waste reduction initiatives
- 🚲 **sustainable-transport**: Electric vehicles, bike sharing
- 💧 **water-conservation**: Clean water and conservation projects
- 🏢 **green-building**: Eco-friendly construction and retrofitting

## 🔒 Security Features

- ✅ Input validation for all parameters
- 🛡️ Access control for sensitive operations
- 💸 Automatic refund mechanism for failed projects
- ⏳ Time-based restrictions for fund claiming
- 🔐 Secure STX token handling

## 🧪 Testing

The contract includes comprehensive test coverage for:
- Project creation and management
- Contribution handling
- Fund claiming and refunds
- Edge cases and error handling

Run tests with:
```bash
npm test
```

## 🌐 Deployment

Deploy to testnet:
```bash
clarinet deploy --testnet
```

Deploy to mainnet:
```bash
clarinet deploy --mainnet
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌟 Support

If you find this project helpful, please give it a star! ⭐


---

**Building a greener future, one project at a time! 🌱✨**
