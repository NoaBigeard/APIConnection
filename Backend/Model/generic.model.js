class TableBuilder {
  constructor(table) {
    const allowedTables = [
      "users",
      "articles",
      "categories",
      "orders",
      "comments",
      "addresses",
      "configurations",
      "photos",
      "discountcode",
      "favorites",
      "colors",
      "sizes",
      "test",
    ];
    if (!allowedTables.includes(table)) {
      throw { status: 400, message: `Table "${table}" non autorisée` };
    }

    this.table = table;
    this.selectFields = "*";
    this.orderByColumn = [];
    this.limitRange = 10;
    this.offsetRange = 0;
    this.setParameters = [];
    this.setClause = [];
    this.whereConditions = [];
    this.whereParameters = [];
    this.queryType = "SELECT";
    this.insertData = null;
  }

  select(fields) {
    this.selectFields = fields;
    return this;
  }

  limit(limitR) {
    this.limitRange = parseInt(limitR, 10) || 10;
    return this;
  }

  offset(offsetR) {
    this.offsetRange = parseInt(offsetR, 10) || 0;
    return this;
  }

  orderBy(columnName, orderAttr = "ASC") {
    this.orderByColumn.push(`${columnName} ${orderAttr}`);
    return this;
  }

  where(column, operator = "=", value) {
    this.whereParameters.push(value);
    this.whereConditions.push({ column, operator });
    return this;
  }

  insert(data) {
    this.queryType = "INSERT";
    this.insertData = data;
    return this;
  }

  update(data) {
    this.queryType = "UPDATE";
    const keys = Object.keys(data);
    const values = Object.values(data);

    keys.forEach((key, index) => {
      this.setClause.push(`${key} = $${index + 1}`);
      this.setParameters.push(values[index]);
    });
    return this;
  }

  delete() {
    this.queryType = "DELETE";
    return this;
  }

  build() {
    switch (this.queryType) {
      case "SELECT": {
        const whereClause = this.whereConditions
          .map(
            (conditions, index) =>
              `${conditions.column} ${conditions.operator} $${index + 1}`,
          )
          .join(" AND ");

        let query = `SELECT ${this.selectFields} FROM ${this.table}`;
        if (whereClause) query += ` WHERE ${whereClause}`;
        if (this.orderByColumn.length)
          query += ` ORDER BY ${this.orderByColumn.join(", ")}`;
        query += ` LIMIT ${this.limitRange} OFFSET ${this.offsetRange}`;

        return {
          query,
          parameters: this.whereParameters,
        };
      }

      case "INSERT": {
        const keys = Object.keys(this.insertData);
        const values = Object.values(this.insertData);
        const placeholders = keys.map((_, index) => `$${index + 1}`);

        return {
          query: `INSERT INTO ${this.table} (${keys.join(", ")}, creation_date, change_date, deleted)
            VALUES (${placeholders.join(", ")}, NOW(), NOW(), false) RETURNING *`,
          parameters: values,
        };
      }

      case "UPDATE": {
        const whereClause = this.whereConditions
          .map(
            (conditions, index) =>
              `${conditions.column} ${conditions.operator} $${this.setParameters.length + index + 1}`,
          )
          .join(" AND ");

        let query = `UPDATE ${this.table} SET ${this.setClause.join(", ")}, change_date = NOW()`;
        if (whereClause) query += ` WHERE ${whereClause}`;
        query += ` RETURNING *`;

        return {
          query,
          parameters: [...this.setParameters, ...this.whereParameters],
        };
      }

      case "DELETE": {
        const whereClause = this.whereConditions
          .map(
            (conditions, index) =>
              `${conditions.column} ${conditions.operator} $${index + 1}`,
          )
          .join(" AND ");

        let query = `DELETE FROM ${this.table}`;
        if (whereClause) query += ` WHERE ${whereClause}`;
        query += ` RETURNING *`;

        return {
          query,
          parameters: this.whereParameters,
        };
      }

      default: {
        throw {
          status: 400,
          message: `Type de requête "${this.queryType}" non pris en charge`,
        };
      }
    }
  }
}

module.exports = {
  TableBuilder,
};
