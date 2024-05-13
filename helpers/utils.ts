class Utils {
  static getFormattedDate(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  static getYesterdayDate(): Date {
    const today = this.getPstDate();
    return new Date(today.setDate(today.getDate() - 1));
  }

  static getPstDate(): Date {
    let date = new Date(new Date().toLocaleString('en', { timeZone: 'America/Los_Angeles' }));
    return date;
  }
}

export default Utils;