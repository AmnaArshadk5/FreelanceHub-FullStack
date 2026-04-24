const services = require('../data/services.json');
let savedServices = [];
let hiredServices = [];

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function toNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') return Number(value);
    return NaN;
}

function parseId(req) {
    const raw = req.body?.id ?? req.params?.id;
    const id = Number.parseInt(raw, 10);
    return Number.isInteger(id) ? id : null;
}

exports.getAllServices = (req, res) => {
    res.status(200).json(services);
};

exports.getServiceById = (req, res) => {
    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid service id" });

    const service = services.find(s => s.id === id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.status(200).json(service);
};

exports.addService = (req, res) => {
    const { title, category, price, rating, description } = req.body || {};

    const numericPrice = toNumber(price);
    const numericRating = toNumber(rating);

    if (!isNonEmptyString(title)) return res.status(400).json({ message: "Title is required" });
    if (!isNonEmptyString(category)) return res.status(400).json({ message: "Category is required" });
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return res.status(400).json({ message: "Price must be a positive number" });
    if (!Number.isFinite(numericRating) || numericRating < 0 || numericRating > 5) return res.status(400).json({ message: "Rating must be between 0 and 5" });
    if (!isNonEmptyString(description)) return res.status(400).json({ message: "Description is required" });

    const nextId = services.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1;
    const newService = {
        id: nextId,
        title: title.trim(),
        category: category.trim(),
        price: Number(numericPrice),
        rating: Number(numericRating),
        description: description.trim()
    };

    services.push(newService);
    return res.status(201).json({ message: "Service added", service: newService });
};

exports.saveService = (req, res) => {
    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid service id" });

    const service = services.find(s => s.id === id);
    if (!service) return res.status(404).json({ message: "Service not found" });

    if (!savedServices.find(s => s.id === id)) {
        savedServices.push(service);
        return res.status(201).json({ message: "Saved successfully", savedServices });
    }
    res.status(400).json({ message: "Already saved" });
};

exports.hireService = (req, res) => {
    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid service id" });

    const service = services.find(s => s.id === id);
    if (service) {
        if (hiredServices.find(s => s.id === id)) {
            return res.status(400).json({ message: "Already hired" });
        }
        hiredServices.push({ ...service, date: new Date() });
        return res.status(201).json({ message: "Hired successfully", hiredServices });
    }
    res.status(404).json({ message: "Service not found" });
};

exports.getSaved = (req, res) => res.status(200).json(savedServices);
exports.getHired = (req, res) => res.status(200).json(hiredServices);
