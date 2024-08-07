class Utils {
  static getFormattedDate(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  static getYesterdayDate(): Date {
    const today = this.getPstDate();
    return new Date(today.setDate(today.getDate() - 1));
  }

  static getPstDate(): Date {
    let date = new Date(
      new Date().toLocaleString("en", { timeZone: "America/Los_Angeles" })
    );
    return date;
  }

  static addDays(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  static joinData(
    on: Array<string>,
    dataframes: Array<Array<Record<string, any>>>
  ): Array<any> {
    try {
      if (dataframes.length === 0) {
        return [];
      }
      if (dataframes.length === 1) {
        return dataframes[0];
      }
      const indexedDataframes = dataframes.map((dataframe) => {
        const indexedDataframe: Record<string, any> = {};
        dataframe.forEach((row) => {
          const key = on.map((key) => row[key]).join("-");
          indexedDataframe[key] = row;
        });
        return indexedDataframe;
      });
      const indexes = Object.keys(indexedDataframes[0]);
      const combinedData = indexes.map((index) => {
        let combinedRow = {};
        indexedDataframes.forEach((dataframe) => {
          combinedRow = { ...combinedRow, ...dataframe[index] };
        });
        return combinedRow;
      });
      return combinedData;
    } catch (error) {
      throw new Error(`Failed to join data: ${error}`);
    }
  }

  static unionData(
    dataframe1: Array<Record<string, any>>,
    dataframe2: Array<Record<string, any>>
  ): Array<Record<string, any>> {
    let index1: Record<string, any> = {};
    let index2: Record<string, any> = {};
    dataframe1.forEach((row) => {
      index1 = { ...index1, ...row };
    });
    dataframe2.forEach((row) => {
      index2 = { ...index2, ...row };
    });
    const keys1 = Object.keys(index1);
    const keys2 = Object.keys(index2);
    if (keys1.length === 0) {
      return dataframe2;
    }
    if (keys2.length === 0) {
      return dataframe1;
    }
    if (keys1.length !== keys2.length) {
      throw new Error("Dataframes have different number of columns");
    }
    if (keys1.some((key) => !keys2.includes(key))) {
      throw new Error("Dataframes have different columns");
    }
    const unionData: Array<Record<string, any>> = [];
    unionData.push(...dataframe1, ...dataframe2);
    return unionData;
  }

  static assignLiteralColumn(
    dataframe: Array<Record<string, any>>,
    columnName: string,
    value: string
  ): Array<Record<string, any>> {
    dataframe.forEach((row) => {
      row[columnName] = value;
    });
    return dataframe;
  }
}

export default Utils;
