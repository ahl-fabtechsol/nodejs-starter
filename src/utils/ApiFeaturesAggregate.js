import mongoose from "mongoose";

class ApiFeaturesAggregate {
  constructor(pipeline, queryString, model) {
    this.pipeline = pipeline;
    this.queryString = queryString;
    this.model = model;
  }

  parseValue(type, value) {
    if (type === "Number") return Number(value);
    if (type === "Boolean") return value === "true";
    if (type === "Date") return new Date(value);
    return value;
  }

  filter() {
    const schemaPaths = this.model.schema.paths;
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((field) => delete queryObj[field]);

    const matchStage = {};

    Object.keys(queryObj).forEach((key) => {
      if (!queryObj[key]) return;

      const fieldType = schemaPaths[key]?.instance;
      const isArray = schemaPaths[key]?.$isMongooseArray;

      if (isArray && schemaPaths[key]?.caster.instance === "ObjectId") {
        matchStage[key] = { $in: [new mongoose.Types.ObjectId(queryObj[key])] };
      } else if (fieldType === "String" || fieldType === "ObjectId") {
        if (fieldType === "String") {
          matchStage[key] = { $regex: new RegExp(`^${queryObj[key]}`, "i") };
        } else {
          matchStage[key] = new mongoose.Types.ObjectId(queryObj[key]);
        }
      } else if (key.includes("[") && key.includes("]")) {
        const [fieldName, operator] = key.split(/\[|\]/).filter(Boolean);
        const mongoOperator = `$${operator}`;
        const parsedValue = this.parseValue(
          schemaPaths[fieldName]?.instance,
          queryObj[key]
        );

        matchStage[fieldName] = {
          ...matchStage[fieldName],
          [mongoOperator]: parsedValue,
        };
      } else if (typeof queryObj[key] === "object") {
        const fieldName = key;
        const fieldValue = queryObj[key];
        const fieldType = schemaPaths[fieldName]?.instance;

        Object.keys(fieldValue).forEach((operator) => {
          const mongoOperator = `$${operator}`;
          const parsedValue = this.parseValue(fieldType, fieldValue[operator]);

          matchStage[fieldName] = {
            ...matchStage[fieldName],
            [mongoOperator]: parsedValue,
          };
        });
      } else {
        const parsedValue = this.parseValue(fieldType, queryObj[key]);
        matchStage[key] = parsedValue;
      }
    });

    if (Object.keys(matchStage).length) {
      this.pipeline.unshift({ $match: matchStage });
    }

    if (this.queryString.search) {
      const searchFields = Object.keys(schemaPaths).filter(
        (field) => schemaPaths[field]?.instance === "String"
      );
      const regex = new RegExp(this.queryString.search, "i");
      matchStage.$or = searchFields.map((field) => ({
        [field]: { $regex: regex },
      }));
      this.pipeline.unshift({ $match: matchStage });
    }

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortObj = {};
      const sortFields = this.queryString.sort.split(",");
      sortFields.forEach((field) => {
        if (field.startsWith("-")) {
          sortObj[field.slice(1)] = -1;
        } else {
          sortObj[field.slice(1)] = 1;
        }
      });
      console.log(sortObj);
      this.pipeline.push({ $sort: sortObj });
    } else {
      this.pipeline.push({ $sort: { createdAt: -1 } });
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").reduce((acc, field) => {
        acc[field] = 1;
        return acc;
      }, {});
      this.pipeline.push({ $project: fields });
    }

    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10000;
    const skip = (page - 1) * limit;

    this.pipeline.push({ $skip: skip }, { $limit: limit });

    return this;
  }
}

export default ApiFeaturesAggregate;
