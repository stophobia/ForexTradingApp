// Index enumeration
const Index = {
    EURUSD: "EURUSD",
    GBPUSD: "GBPUSD",
  
    IndexOps: class {
      constructor(index) {
        this.index = index;
      }
  
      asString() {
        return this.index;
      }
    },
  };
  
  // TimeFrame enumeration
  const TimeFrame = {
    Min1: "1m",
    Min3: "3m",
    Min5: "5m",
  
    TimeFrameOps: class {
      constructor(timeFrame) {
        this.timeFrame = timeFrame;
      }
  
      asString() {
        return this.timeFrame;
      }
    },
  };
  
//   // Example usage
//   const bankNiftyIndex = new Index.IndexOps(Index.BankNifty);
//   console.log(bankNiftyIndex.asString()); // Output: BankNifty
  
//   const min3TimeFrame = new TimeFrame.TimeFrameOps(TimeFrame.Min3);
//   console.log(min3TimeFrame.asString()); // Output: Min3
  