import faker from 'faker';
import uuid from 'uuid';
import { logger } from '../helpers';
import * as queries from '../db/queries';
import db from '../db';

class BaseModel {
  constructor(args = '') {
    if (args) this.updateFields(args);
    this.uuid = uuid.v4();
  }

  getUID() {
    return this.uuid;
  }

  toObject({ withHidden = false } = {}) {
    const fields = { ...this };
    let hidden;
    delete fields.uuid;
    if (this.hidden !== undefined) {
      hidden = [...fields.hidden];
    }
    if (this.storage !== undefined) {
      delete fields.storage;
    }
    if (this.hidden !== undefined) {
      delete fields.hidden;
    }
    if (!withHidden && hidden) {
      // Delete all hidden properties before returning the object
      hidden.forEach((value) => {
        if (fields[value] !== undefined) {
          delete fields[value];
        }
      });
    }
    return { ...fields };
  }

  // Filter items by id
  findById(id = '') {
    return new Promise((resolve, reject) => {
      if (!id) return reject(new Error('Failed, please provide the id'));
      const { queryById = undefined } = queries[`${this.storage}Query`];
      if (queryById === undefined) {
        return reject(new Error('Failed, model storage not set'));
      }
      try {
        db.query(queryById, [id])
          .then((res) => {
            const row = res.rows[0];
            this.updateFields(row);
            resolve({ data: row });
          })
          .catch((err) => {
            console.log(err)
            logger.error(err);
            reject(new Error('Failed, could query the user'));
          });
      } catch (err) {
        reject(new Error('Failed, could query the user'));
      }
    });
  }

  // Update given proterties
  updateFields(fields = '') {
    if (fields) {
      const keys = Object.keys(fields);
      keys.forEach((key) => {
        if (fields[key] !== undefined) {
          this[key] = fields[key];
        }
      });
    }
  }

  getFirst() {
    return new Promise((resolve, reject) => {
      if (this.storage === undefined) reject(new Error('Storage not defined'));
      const query = queries[`${this.storage}Query`].getFirst;
      db.query(query)
        .then(res => resolve(res.rows[0]))
        .catch(err => reject(err));
    });
  }

  // Returns all items or an empty array
  getAll({ search = '', page = 1} = {}) {
    const limit = 25;
    const startAt = (page - 1) * limit;
    return new Promise((resolve, reject) => {
      if (!this.storage) reject(new Error('Failed, storage not set'));
      const query = queries[`${this.storage}Query`].queryAll;
      db.query(query, [startAt])
        .then(res => resolve(res.rows))
        .catch(err => reject(err));
    });
  }

  // Updates createdAt and updatedAt date
  updateDate() {
    // Set created at date
    if (!this.createdAt) {
      this.createdAt = Date.now();
      this.updatedAt = this.createdAt;
    } else {
      this.createdAt = Date.now();
    }
  }

  // Save properies to the array
  save({ withHidden = false } = {}) {
    return new Promise(async (resolve, reject) => {
      if (!this.storage) reject(new Error('Please set storage'));
      // Check if the array name was set
      if (!this.id) {
        this.id = faker.random.uuid();
      }
      // Check the existance of the array
      if (!global[this.storage]) {
        global[this.storage] = []; // Initialises the array
      }
      let items = global[this.storage];
      if (this.storage === 'users') {
        // If a user with the same email already exist
        if (items.some(v => v.email === this.email && v.id !== this.id)) {
          reject(new Error(`${this.email} account already exist`));
        }
        this.updateDate();
        items = items.map((item) => {
          if (item.email === this.email) {
            return this.toObject({ withHidden: true });
          }
          return item;
        });
        global[this.storage] = [...items, this.toObject({ withHidden: true })];
      } else {
        this.updateDate();
        // Add new item to the array without mutating
        global[this.storage] = [
          ...items,
          this.toObject({ withHidden: true }),
        ];
      }
      resolve(this.toObject({ withHidden }));
    });
  }
}

export default BaseModel;
