function errorHandler(err, req, res, next) {
    console.error('Unhandled error:', err);

    if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    if (err.name === 'PrismaClientKnownRequestError') {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Resource already exists (conflict)' });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Resource not found' });
        }
    }

    res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
