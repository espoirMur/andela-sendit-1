import { isCelebrate } from 'celebrate';

const joiErrors = () => (err, req, res, next) => {
  if (!isCelebrate(err)) return next(err);
  return res.status(400).json({
    success: false,
    message: 'Bad Request',
    errFields: err.details || undefined,
  });
};

export default joiErrors;
